import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import path from 'path';

const MUSIC_STATE_FILE = path.join(process.cwd(), 'music-state.json');

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

async function readMusicState() {
  try {
    const content = await fs.readFile(MUSIC_STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      history: [],
    };
  }
}

export async function GET() {
  try {
    const state = await readMusicState();
    const playbackState: PlaybackState = {
      isPlaying: state.isPlaying || false,
      currentTime: state.currentTime || 0,
      duration: state.duration || 0,
    };
    return NextResponse.json(playbackState);
  } catch (error) {
    console.error('Error reading playback state:', error);
    return NextResponse.json(
      { isPlaying: false, currentTime: 0, duration: 0 },
      { status: 200 }
    );
  }
}
