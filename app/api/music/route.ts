import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MUSIC_STATE_FILE = path.join(process.cwd(), 'music-state.json');

interface MusicFile {
  id: string;
  name: string;
  url: string;
}

interface MusicState {
  mainFile?: MusicFile;
  imposterFile?: MusicFile;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  history: MusicFile[];
}

const defaultState: MusicState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  history: [],
};

async function ensureHistoryExists(): Promise<void> {
  try {
    const state = await readMusicState();
    if (!state.history) {
      state.history = [];
      await writeMusicState(state);
    }
  } catch {
    // Ignore errors
  }
}

async function ensureMusicFile(): Promise<void> {
  try {
    await fs.access(MUSIC_STATE_FILE);
  } catch {
    await fs.writeFile(
      MUSIC_STATE_FILE,
      JSON.stringify(defaultState),
      'utf-8'
    );
  }
}

async function readMusicState(): Promise<MusicState> {
  await ensureMusicFile();
  const content = await fs.readFile(MUSIC_STATE_FILE, 'utf-8');
  return JSON.parse(content || JSON.stringify(defaultState));
}

async function writeMusicState(state: MusicState): Promise<void> {
  await fs.writeFile(
    MUSIC_STATE_FILE,
    JSON.stringify(state, null, 2),
    'utf-8'
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  try {
    const state = await readMusicState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error reading music state:', error);
    return NextResponse.json(defaultState);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isPlaying, currentTime, duration } = body;

    const state = await readMusicState();

    if (typeof isPlaying === 'boolean') {
      state.isPlaying = isPlaying;
    }
    if (typeof currentTime === 'number') {
      state.currentTime = currentTime;
    }
    if (typeof duration === 'number') {
      state.duration = duration;
    }

    await writeMusicState(state);

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error updating music state:', error);
    return NextResponse.json(
      { error: 'Failed to update music state' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('PUT /api/music called');
  try {
    console.log('Reading formData...');
    const formData = await request.formData();
    console.log('FormData received, keys:', Array.from(formData.keys()));
    const file = formData.get('file') as File;
    console.log('File:', file?.name);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadsDir, filename);

    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    const state = await readMusicState();

    // Ensure history exists
    if (!state.history) {
      state.history = [];
    }

    const musicFile: MusicFile = {
      id: randomUUID(),
      name: file.name,
      url: `/uploads/${filename}`,
    };

    state.history.push(musicFile);
    state.isPlaying = false;
    state.currentTime = 0;

    await writeMusicState(state);

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error uploading music:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to upload music', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, clearAll } = body;

    const state = await readMusicState();

    if (clearAll) {
      // Delete all files
      for (const file of state.history) {
        const filepath = path.join(process.cwd(), 'public', file.url);
        try {
          await fs.unlink(filepath);
        } catch {
          // File might already be deleted
        }
      }

      const resetState: MusicState = {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        history: [],
      };

      await writeMusicState(resetState);
      return NextResponse.json(resetState);
    }

    if (!fileId) {
      return NextResponse.json(
        { error: 'No fileId provided' },
        { status: 400 }
      );
    }

    const fileIndex = state.history.findIndex((f) => f.id === fileId);
    if (fileIndex === -1) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = state.history[fileIndex];
    const filepath = path.join(process.cwd(), 'public', file.url);
    try {
      await fs.unlink(filepath);
    } catch {
      // File might already be deleted
    }

    state.history.splice(fileIndex, 1);

    // Clear references if it was main or imposter file
    if (state.mainFile?.id === fileId) {
      state.mainFile = undefined;
      state.isPlaying = false;
    }
    if (state.imposterFile?.id === fileId) {
      state.imposterFile = undefined;
    }

    await writeMusicState(state);
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error deleting music:', error);
    return NextResponse.json(
      { error: 'Failed to delete music' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, type, clearImposter, clearMain } = body;

    const state = await readMusicState();

    // Handle clearing main file
    if (clearMain) {
      state.mainFile = undefined;
      state.isPlaying = false;
      state.currentTime = 0;
      await writeMusicState(state);
      return NextResponse.json(state);
    }

    // Handle clearing imposter file
    if (clearImposter) {
      state.imposterFile = undefined;
      await writeMusicState(state);
      return NextResponse.json(state);
    }

    if (!fileId || !['main', 'imposter'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid fileId or type' },
        { status: 400 }
      );
    }

    const file = state.history.find((f) => f.id === fileId);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (type === 'main') {
      state.mainFile = file;
      state.isPlaying = false;
      state.currentTime = 0;
    } else if (type === 'imposter') {
      state.imposterFile = file;
    }

    await writeMusicState(state);
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error updating music:', error);
    return NextResponse.json(
      { error: 'Failed to update music' },
      { status: 500 }
    );
  }
}
