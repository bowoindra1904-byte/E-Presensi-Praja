import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Square,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  X
} from 'lucide-react';
import { musicEngine } from '../../services/musicEngine';

interface FloatingMusicBarProps {
  onOpenFullModal: () => void;
}

export const FloatingMusicBar: React.FC<FloatingMusicBarProps> = ({ onOpenFullModal }) => {
  const [, setTick] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsub = musicEngine.subscribe(() => {
      setTick(t => t + 1);
    });
    return () => unsub();
  }, []);

  const currentTrack = musicEngine.getCurrentTrack();
  const isPlaying = musicEngine.getIsPlaying();
  const isMuted = musicEngine.getIsMuted();
  const volume = musicEngine.getVolume();

  // If user explicitly dismissed and nothing is playing, don't show floating bar.
  // But if playing starts, re-show it!
  if (isDismissed && !isPlaying) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 text-slate-100">
        
        {/* Disc Icon / Visualizer Indicator */}
        <div 
          onClick={onOpenFullModal}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          title="Klik untuk membuka pemutar lengkap"
        >
          <div className="relative shrink-0">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md ${
              isPlaying ? 'animate-pulse' : ''
            }`}>
              <Music className="w-5 h-5" />
            </div>
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
                {currentTrack.genre}
              </span>
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 bg-amber-400 h-full animate-pulse" />
                  <span className="w-0.5 bg-amber-400 h-1.5 animate-bounce" />
                  <span className="w-0.5 bg-amber-400 h-2 animate-pulse" />
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[170px] group-hover:text-amber-300 transition-colors">
              {currentTrack.title}
            </p>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => musicEngine.togglePlay()}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow transition-all active:scale-95"
            title={isPlaying ? 'Jeda' : 'Putar'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              musicEngine.pause();
              setIsDismissed(true);
            }}
            className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/60 transition-colors"
            title="Matikan Musik Sepenuhnya"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => musicEngine.nextTrack()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Lagu Selanjutnya"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => musicEngine.toggleMute()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Suara Senyap' : 'Senyapkan'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenFullModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
            title="Buka Pemutar Penuh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              musicEngine.pause();
              setIsDismissed(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-colors"
            title="Tutup Musik"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
