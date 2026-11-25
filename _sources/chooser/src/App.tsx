/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { StartScreen } from './components/StartScreen';
import {
  ChooserAudio,
  configurePlaybackAudioSession,
  SILENT_WAV_DATA_URI,
} from './game/audio';

function hasAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState<boolean>(hasAutostartParam);
  const [mountStartScreen, setMountStartScreen] = useState<boolean>(() => !hasAutostartParam());
  const audioRef = useRef<ChooserAudio | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioRef.current) {
    audioRef.current = new ChooserAudio();
  }

  useEffect(() => {
    configurePlaybackAudioSession();
    audioRef.current?.attachKeepAliveAudio(silentAudioRef.current);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioRef.current?.pauseKeepAlive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.state = isPlaying ? 'playing' : 'title';
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      setMountStartScreen(false);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    configurePlaybackAudioSession();
    audioRef.current?.unlock(silentAudioRef.current);
    document.body.dataset.state = 'playing';
    setIsPlaying(true);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#07070A]">
      <audio
        ref={silentAudioRef}
        src={SILENT_WAV_DATA_URI}
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="hidden"
      />
      <GameCanvas active={isPlaying} audio={audioRef.current} />
      {mountStartScreen && <StartScreen visible={!isPlaying} onPlay={handlePlay} />}
    </div>
  );
}
