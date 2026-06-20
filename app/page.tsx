'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

interface Player {
  id: string;
  name: string;
  isImposter?: boolean;
}

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function MusicPlayer({ playerId }: { playerId: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fast polling for playback state only
  const { data: playbackState } = useSWR(
    '/api/music/playback',
    fetcher,
    {
      refreshInterval: 300,
      dedupingInterval: 100,
    }
  );

  // Slower polling for music files and configuration
  const { data: musicState } = useSWR<MusicState>(
    '/api/music',
    fetcher,
    {
      refreshInterval: 5000,
      dedupingInterval: 2000,
    }
  );

  const { data: players = [] } = useSWR<Player[]>(
    '/api/players',
    fetcher,
    {
      refreshInterval: 1500,
      dedupingInterval: 1000,
    }
  );

  // Merge fast playback state with slower music state
  const mergedMusicState = musicState
    ? {
        ...musicState,
        isPlaying: playbackState?.isPlaying ?? musicState.isPlaying ?? false,
        currentTime: playbackState?.currentTime ?? musicState.currentTime ?? 0,
        duration: playbackState?.duration ?? musicState.duration ?? 0,
      }
    : musicState;

  const currentPlayer = players.find((p) => p.id === playerId);
  const isImposter = currentPlayer?.isImposter || false;
  const currentFile = isImposter && mergedMusicState?.imposterFile
    ? mergedMusicState.imposterFile
    : mergedMusicState?.mainFile;

  useEffect(() => {
    if (!audioRef.current || !currentFile) return;

    if (mergedMusicState?.isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [mergedMusicState?.isPlaying, currentFile]);

  useEffect(() => {
    if (!audioRef.current || !mergedMusicState) return;

    const currentTime = audioRef.current.currentTime;
    if (Math.abs(currentTime - mergedMusicState.currentTime) > 2) {
      audioRef.current.currentTime = mergedMusicState.currentTime;
    }
  }, [mergedMusicState?.currentTime]);

  if (!currentFile) {
    return (
      <div className="text-center py-12">
        <div className="text-7xl mb-6 animate-pulse">🎵</div>
      </div>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={currentFile.url}
        crossOrigin="anonymous"
      />

      <div className="text-center space-y-8">
        <div className="text-8xl">
          {mergedMusicState?.isPlaying ? '🎵' : '⏸'}
        </div>

        <p className="text-2xl font-light text-gray-600 tracking-wide">
          {mergedMusicState?.isPlaying ? 'Музыка' : 'Пауза'}
        </p>
      </div>
    </>
  );
}

export default function PlayerPage() {
  const [name, setName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { data: players = [], mutate: mutatePlayers } = useSWR<Player[]>(
    '/api/players',
    fetcher,
    {
      refreshInterval: 1500,
      dedupingInterval: 1000,
    }
  );


  useEffect(() => {
    const savedId = localStorage.getItem('playerId');
    if (savedId) {
      setPlayerId(savedId);
    }
  }, []);

  useEffect(() => {
    if (!playerId) return;

    const currentPlayer = players.find((p) => p.id === playerId);
    if (!currentPlayer) {
      localStorage.removeItem('playerId');
      setPlayerId(null);
      setName('');
    }
  }, [players, playerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      console.error('Request timeout');
    }, 10000);

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const player = await response.json();
        localStorage.setItem('playerId', player.id);
        setPlayerId(player.id);

        // Обновить список игроков сразу
        mutatePlayers((prevPlayers) => [...(prevPlayers || []), player], false);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!playerId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/players', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: playerId }),
      });

      if (response.ok) {
        localStorage.removeItem('playerId');
        setPlayerId(null);
        setName('');
        setLoading(false);
      } else {
        setLoading(false);
        console.error('Failed to delete player');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {!playerId ? (
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-light text-purple-400 mb-2 tracking-tight">
              Music Imposter
            </h1>
            <p className="text-gray-400 text-lg">Введите ваше имя</p>
          </div>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading && name.trim()) {
                handleSubmit(e as any);
              }
            }}
            placeholder="Имя..."
            className="w-full px-6 py-3 mb-4 border-0 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg text-center"
            autoFocus
          />

          <button
            onClick={(e) => {
              e.preventDefault();
              if (!loading && name.trim()) {
                handleSubmit(e as any);
              }
            }}
            disabled={loading || !name.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
          >
            {loading ? 'Присоединяюсь...' : 'Начать игру'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-12">
          <div className="text-center">
            <p className="text-6xl font-light text-purple-400">
              {players.find((p) => p.id === playerId)?.name}
            </p>
          </div>

          <MusicPlayer playerId={playerId} />

          <button
            onClick={handleLeave}
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white font-light py-3 px-6 rounded-lg transition text-lg border border-gray-700"
          >
            {loading ? '...' : '✕ Выход'}
          </button>
        </div>
      )}
    </div>
  );
}
