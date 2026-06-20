import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const PLAYERS_FILE = path.join(process.cwd(), 'players.json');

interface Player {
  id: string;
  name: string;
  isImposter?: boolean;
}

async function ensurePlayersFile(): Promise<void> {
  try {
    await fs.access(PLAYERS_FILE);
  } catch {
    await fs.writeFile(PLAYERS_FILE, JSON.stringify([]), 'utf-8');
  }
}

async function readPlayers(): Promise<Player[]> {
  await ensurePlayersFile();
  const content = await fs.readFile(PLAYERS_FILE, 'utf-8');
  return JSON.parse(content || '[]');
}

async function writePlayers(players: Player[]): Promise<void> {
  await fs.writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const players = await readPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error reading players:', error);
    return NextResponse.json(
      { error: 'Failed to read players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid name provided' },
        { status: 400 }
      );
    }

    const players = await readPlayers();
    const newPlayer: Player = {
      id: randomUUID(),
      name: name.trim(),
    };

    players.push(newPlayer);
    await writePlayers(players);

    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json(
      { error: 'Failed to add player' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id provided' },
        { status: 400 }
      );
    }

    const players = await readPlayers();
    const filteredPlayers = players.filter((p) => p.id !== id);

    if (filteredPlayers.length === players.length) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    await writePlayers(filteredPlayers);

    return NextResponse.json(filteredPlayers);
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isImposter } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid id provided' },
        { status: 400 }
      );
    }

    const players = await readPlayers();
    const playerIndex = players.findIndex((p) => p.id === id);

    if (playerIndex === -1) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    if (typeof isImposter === 'boolean') {
      players[playerIndex].isImposter = isImposter;
    }

    await writePlayers(players);

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}
