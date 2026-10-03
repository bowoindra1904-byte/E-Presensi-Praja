import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Upload,
  X,
  FileText,
  Shield,
  Disc,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { musicEngine, TrackInfo } from '../../services/musicEngine';

interface MusicPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicPlayerModal: React.FC<MusicPlayerModalProps> = ({ isOpen, onClose }) => {
  const [, setTick] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to engine state
  useEffect(() => {
    const unsub = musicEngine.subscribe(() => {
      setTick(t => t + 1);
    });
    return () => unsub();
  }, []);

  // Visualizer Animation
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      const data = musicEngine.getVisualizerData();
      const isPlaying = musicEngine.getIsPlaying();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / 24) - 2;
      for (let i = 0; i < 24; i++) {
        // Fallback gentle wave if paused
        const rawVal = isPlaying ? (data[i % data.length] || 40) : 15 + Math.sin(Date.now() / 400 + i) * 10;
        const barHeight = Math.max(4, (rawVal / 255) * canvas.height * 0.9);

        // Gradient from amber-500 to gold
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        grad.addColorStop(0, '#d97706'); // amber-600
        grad.addColorStop(0.5, '#f59e0b'); // amber-500
        grad.addColorStop(1, '#fde68a'); // amber-200

        ctx.fillStyle = grad;
        ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTrack = musicEngine.getCurrentTrack();
  const isPlaying = musicEngine.getIsPlaying();
  const volume = musicEngine.getVolume();
  const isMuted = musicEngine.getIsMuted();
  const isLooping = musicEngine.getIsLooping();
  const currentTime = musicEngine.getCurrentTime();
  const tracks = musicEngine.getTracks();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      musicEngine.addCustomTrack(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Music className={`w-5 h-5 ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pemutar Musik & Mars Kedinasan
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SI-PRAJA Audio
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mars Resmi Satpol PP, Lagu Kebangsaan, Serumpun Sebalai & Genderang Apel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Tutup Pemutar Musik"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Main Player Card */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/20 rounded-2xl p-5 shadow-inner">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Spinning Vinyl Disc */}
              <div className="relative shrink-0">
                <div 
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  {/* Vinyl Grooves */}
                  <div className="absolute inset-2 rounded-full border border-slate-700/50" />
                  <div className="absolute inset-5 rounded-full border border-slate-700/30" />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border-2 border-slate-900 flex items-center justify-center text-slate-950">
                    <Shield className="w-5 h-5 fill-current" />
                  </div>
                </div>

                {isPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                  </span>
                )}
              </div>

              {/* Track Info & Visualizer */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                  {currentTrack.genre}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight truncate">
                  {currentTrack.title}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {currentTrack.artist}
                </p>

                {/* Equalizer Canvas */}
                <div className="pt-2">
                  <canvas 
                    ref={canvasRef} 
                    width={260} 
                    height={36} 
                    className="w-full max-w-xs h-9 mx-auto sm:mx-0 rounded bg-slate-950/60 p-1 border border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Timeline Progress */}
            <div className="mt-5 space-y-1">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (currentTime / (currentTrack.durationSeconds || 60)) * 100)}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentTrack.durationSeconds)}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              {/* Loop & Lyrics Toggles */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => musicEngine.toggleLoop()}
                  className={`p-2 rounded-xl text-xs font-medium transition-all ${
                    isLooping
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isLooping ? 'Putar Ulang Aktif' : 'Aktifkan Putar Ulang'}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {currentTrack.lyrics && (
                  <button
                    type="button"
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      showLyrics
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Lihat Lirik / Naskah Lagu"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lirik</span>
                  </button>
                )}
              </div>

              {/* Central Transport (Prev, Play/Pause, Next) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => musicEngine.prevTrack()}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shadow"
                  title="Lagu Sebelumnya"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => musicEngine.togglePlay()}
                  className="p-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                  title={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => musicEngine.pause()}
                  className="p-3 rounded-full bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-white border border-rose-800/40 shadow transition-all"
                  title="Hentikan Musik (Stop)"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={() => musicEngine.nextTrack()}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shadow"
                  title="Lagu Selanjutnya"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2">
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
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => musicEngine.setVolume(parseFloat(e.target.value))}
                  className="w-16 sm:w-24 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>
          </div>

          {/* Lyrics Accordion (if open) */}
          {showLyrics && currentTrack.lyrics && (
            <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Naskah Syair: {currentTrack.title}
              </h4>
              <div className="space-y-1.5 font-serif italic text-sm text-slate-200 pl-3 border-l-2 border-amber-500/50">
                {currentTrack.lyrics.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Tip Notice Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white">Audio Rekaman Dinas & Fasilitas Upload MP3:</span>
              <p className="text-[11px] text-slate-300">
                Lagu telah diperbarui menggunakan rekaman simfoni band orkestra kedinasan asli. Jika Anda memiliki file audio rekaman studio resmi Mars Satpol PP Bangka Barat, silakan gunakan tombol <strong>"Unggah MP3"</strong> di bawah untuk memutarnya langsung dari perangkat Anda.
              </p>
            </div>
          </div>

          {/* Playlist Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-amber-400" />
                Daftar Putar Satpol PP ({tracks.length} Lagu)
              </h4>

              {/* Upload Custom Audio Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Unggah MP3</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {tracks.map((track, idx) => {
                const isSelected = track.id === currentTrack.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => musicEngine.playTrack(idx)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm text-white'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 font-bold' 
                          : 'bg-slate-800 text-slate-400 font-mono text-xs'
                      }`}>
                        {isSelected && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-slate-950 h-full animate-pulse" />
                            <span className="w-1 bg-slate-950 h-2 animate-bounce" />
                            <span className="w-1 bg-slate-950 h-3 animate-pulse" />
                          </div>
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {track.title}
                          </p>
                          {track.isCustom && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Lokal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-slate-400">
                        {formatTime(track.durationSeconds)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Audio Orkestra & Player Resmi
          </span>
          <div className="flex items-center gap-2">
            {isPlaying && (
              <button
                type="button"
                onClick={() => musicEngine.pause()}
                className="px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Hentikan Musik Sekarang"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Matikan Musik</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
