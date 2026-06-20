'use client';

import { useState, useRef } from 'react';
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

export default function HostPage() {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: players = [], mutate: mutatePlayers } = useSWR<Player[]>(
    '/api/players',
    fetcher,
    {
      refreshInterval: 1500,
      dedupingInterval: 1000,
    }
  );

  const { data: playbackState = {} as { isPlaying: boolean; currentTime: number; duration: number }, mutate: mutatePlaybackState } =
    useSWR('/api/music/playback', fetcher, {
      refreshInterval: 500,
      dedupingInterval: 200,
    });

  const { data: musicState = {} as MusicState, mutate: mutateMusicState } =
    useSWR<MusicState>('/api/music', fetcher, {
      refreshInterval: 5000,
      dedupingInterval: 2000,
    });

  // Merge playback state with music state
  const combinedMusicState = {
    ...musicState,
    isPlaying: playbackState.isPlaying ?? musicState.isPlaying ?? false,
    currentTime: playbackState.currentTime ?? musicState.currentTime ?? 0,
    duration: playbackState.duration ?? musicState.duration ?? 0,
  };

  const handleDeletePlayer = async (playerId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId }),
      });

      if (response.ok) {
        const updated = await response.json();
        mutatePlayers(updated, false);
      }
    } catch (error) {
      console.error('Error deleting player:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleImposter = async (playerId: string, isImposter: boolean) => {
    setLoading(true);
    try {
      const response = await fetch('/api/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, isImposter: !isImposter }),
      });

      if (response.ok) {
        const updated = await response.json();
        mutatePlayers(updated, false);
      }
    } catch (error) {
      console.error('Error updating player:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/music', {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error uploading music:', error);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetMainMusic = async (fileId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, type: 'main' }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error setting main music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetImposterMusic = async (fileId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, type: 'imposter' }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error setting imposter music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMusic = async (fileId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error deleting music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMainMusic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearMain: true }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error clearing main music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearImposterMusic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearImposter: true }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
      }
    } catch (error) {
      console.error('Error clearing imposter music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!musicState) return;

    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPlaying: true,
          currentTime: musicState.currentTime,
          duration: musicState.duration,
        }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
        mutatePlaybackState({ isPlaying: true, currentTime: newState.currentTime, duration: newState.duration }, false);
      }
    } catch (error) {
      console.error('Error playing music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!musicState) return;

    setLoading(true);
    try {
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPlaying: false,
          currentTime: musicState.currentTime,
          duration: musicState.duration,
        }),
      });

      if (response.ok) {
        const newState = await response.json();
        mutateMusicState(newState, false);
        mutatePlaybackState({ isPlaying: false, currentTime: newState.currentTime, duration: newState.duration }, false);
      }
    } catch (error) {
      console.error('Error pausing music:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-light text-purple-400 mb-2">Music Imposter</h1>
        <p className="text-gray-400 mb-8 text-lg">Панель хоста</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Players Section */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
            <div className="border-b border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-purple-400">
                  👥 Игроки
                </h2>
                <span className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full text-xl font-bold">
                  {players.length}
                </span>
              </div>
            </div>

            <div className="p-6">
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Пока нет игроков...</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {players.map((player, index) => (
                    <li
                      key={player.id}
                      className={`flex items-center p-4 rounded-lg border transition ${
                        player.isImposter
                          ? 'border-red-600 bg-red-900/20'
                          : 'border-gray-700 bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold mr-4">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-lg text-white font-medium">
                          {player.name}
                        </p>
                        {player.isImposter && (
                          <p className="text-xs text-red-400 font-semibold">
                            🎭 Импостер
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleToggleImposter(
                              player.id,
                              player.isImposter || false
                            )
                          }
                          disabled={loading}
                          className={`px-3 py-1 rounded text-sm font-semibold transition disabled:opacity-50 ${
                            player.isImposter
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          }`}
                        >
                          {player.isImposter ? '✓' : '🎭'}
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded text-sm font-semibold transition"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Music Section */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
            <div className="border-b border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-purple-400">🎵 Музыка</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Play/Pause Controls */}
              <div className="flex flex-col items-center gap-4">
                {(() => {
                  const hasImposter = players.some((p) => p.isImposter);
                  const canPlay =
                    !loading &&
                    musicState?.mainFile &&
                    musicState?.imposterFile &&
                    hasImposter;

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        {combinedMusicState?.isPlaying ? (
                          <button
                            onClick={handlePause}
                            disabled={loading}
                            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white transition flex items-center justify-center"
                            title="Остановить"
                          >
                            <svg
                              className="w-8 h-8"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={handlePlay}
                            disabled={!canPlay}
                            className={`w-16 h-16 rounded-full text-white transition flex items-center justify-center ${
                              canPlay
                                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                                : 'bg-gray-600 cursor-not-allowed'
                            }`}
                            title="Начать"
                          >
                            <svg
                              className="w-8 h-8"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="text-center text-sm h-16 flex flex-col justify-center">
                        {!combinedMusicState?.isPlaying && (
                          <>
                            {!hasImposter && (
                              <p className="text-red-400">Импостер не выбран</p>
                            )}
                            {!musicState?.mainFile && (
                              <p className="text-red-400">
                                Основная музыка не выбрана
                              </p>
                            )}
                            {!musicState?.imposterFile && (
                              <p className="text-red-400">
                                Музыка импостера не выбрана
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Current Selection */}
              {(musicState.mainFile || musicState.imposterFile) && (
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-purple-300 mb-2">
                    Выбранные треки
                  </div>
                  {musicState.mainFile && (
                    <div className="flex items-center justify-between p-3 bg-gray-600/50 border border-green-600/50 rounded">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Основной</p>
                        <p className="font-semibold text-white truncate text-sm">
                          {musicState.mainFile.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                          MAIN
                        </span>
                        <button
                          onClick={handleClearMainMusic}
                          disabled={loading}
                          className="text-xs bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-2 py-1 rounded transition"
                          title="Сбросить основную музыку"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  {musicState.imposterFile && (
                    <div className="flex items-center justify-between p-3 bg-gray-600/50 border border-red-600/50 rounded">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Импостер</p>
                        <p className="font-semibold text-white truncate text-sm">
                          {musicState.imposterFile.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                          IMPOSTER
                        </span>
                        <button
                          onClick={handleClearImposterMusic}
                          disabled={loading}
                          className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-2 py-1 rounded transition"
                          title="Сбросить"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload */}
              <div className="border-2 border-dashed border-purple-600/50 rounded-lg p-6 text-center bg-gray-700/30">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => !loading && fileInputRef.current?.click()}
                  disabled={loading}
                  className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 font-bold text-lg disabled:opacity-50 cursor-pointer"
                >
                  {loading ? '⏳ Загружаю...' : '📁 Загрузить'}
                </button>
              </div>

              {/* History */}
              {musicState.history && musicState.history.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-purple-300 mb-3">
                    Список песен ({musicState.history.length})
                  </p>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {musicState.history.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600 hover:bg-gray-700 transition"
                      >
                        <span className="flex-1 text-sm text-gray-200 font-medium truncate">
                          {file.name}
                        </span>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleSetMainMusic(file.id)}
                            disabled={loading}
                            className={`px-2 py-1 text-xs font-semibold rounded transition disabled:opacity-50 ${
                              musicState.mainFile?.id === file.id
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 hover:bg-green-600 text-gray-300 hover:text-white'
                            }`}
                            title="Основной"
                          >
                            ▶
                          </button>
                          <button
                            onClick={() => handleSetImposterMusic(file.id)}
                            disabled={loading}
                            className={`px-2 py-1 text-xs font-semibold rounded transition disabled:opacity-50 ${
                              musicState.imposterFile?.id === file.id
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-600 hover:bg-red-600 text-gray-300 hover:text-white'
                            }`}
                            title="Импостер"
                          >
                            🎭
                          </button>
                          <button
                            onClick={() => handleDeleteMusic(file.id)}
                            disabled={loading}
                            className="px-2 py-1 text-xs font-semibold bg-gray-600 hover:bg-gray-500 text-gray-300 rounded transition disabled:opacity-50"
                            title="Удалить"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
