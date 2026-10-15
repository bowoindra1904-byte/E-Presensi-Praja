// Web Audio API Synthesizer & Alarm Management for SIPRAJA Satpol PP & Damkar
// Zero external asset dependencies - works reliably on any browser and mobile device.

export type AlarmSoundType = 'siren' | 'bell' | 'chime';

export interface AlarmConfig {
  enabled: boolean;
  soundType: AlarmSoundType;
  volume: number; // 0.1 to 1.0
  remindCheckIn: boolean; // Remind before check-in window / official start
  remindCheckOut: boolean; // Remind when check-out window opens (Anti-PSW)
  advanceMinutes: number; // 0 = exactly at shift end, 5 = 5m before, 10 = 10m before, 15 = 15m before
  vibrateEnabled: boolean;
  autoSnoozeMinutes: number;
}

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  enabled: true,
  soundType: 'siren',
  volume: 0.8,
  remindCheckIn: true,
  remindCheckOut: true,
  advanceMinutes: 0,
  vibrateEnabled: true,
  autoSnoozeMinutes: 5,
};

const STORAGE_KEY = 'sipraja_alarm_config_v1';

export function getAlarmConfig(): AlarmConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_ALARM_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_ALARM_CONFIG;
}

export function saveAlarmConfig(config: AlarmConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // fallback
  }
}

// Global audio context singleton
let audioCtx: AudioContext | null = null;
let activeLoopInterval: number | null = null;
let activeTimeoutId: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single sequence of the requested alarm sound type
 */
export function playSoundSample(type: AlarmSoundType = 'siren', volume: number = 0.8): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(Math.max(0.05, Math.min(volume, 1.0)), now);
    gainNode.connect(ctx.destination);

    if (type === 'siren') {
      // Tactical Regu Siren (Two-tone emergency duty alert)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      // 4 cycles of alternating hi-lo frequency
      const freqTimeline = [
        { t: 0, f: 900 },
        { t: 0.25, f: 700 },
        { t: 0.5, f: 900 },
        { t: 0.75, f: 700 },
        { t: 1.0, f: 900 },
        { t: 1.25, f: 700 },
      ];

      freqTimeline.forEach(step => {
        osc.frequency.setValueAtTime(step.f, now + step.t);
      });

      // Envelope fade in and out
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.45, now + 0.05);
      gainNode.gain.setValueAtTime(volume * 0.45, now + 1.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.65);

    } else if (type === 'bell') {
      // Resonant digital bell / chime station gong
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.25);

        const noteStart = now + idx * 0.25;
        noteGain.gain.setValueAtTime(0.001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(volume * 0.6, noteStart + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.7);

        noteOsc.connect(noteGain);
        noteGain.connect(gainNode);

        noteOsc.start(noteStart);
        noteOsc.stop(noteStart + 0.75);
      });

    } else {
      // Melodic chime / pleasant duty reminder
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.2);

        const noteStart = now + idx * 0.2;
        noteGain.gain.setValueAtTime(0.001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(volume * 0.5, noteStart + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);

        noteOsc.connect(noteGain);
        noteGain.connect(gainNode);

        noteOsc.start(noteStart);
        noteOsc.stop(noteStart + 0.65);
      });
    }

    // Trigger mobile vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 350]);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('[SIPRAJA Audio Engine] Could not play sound:', err);
  }
}

/**
 * Start repeating alarm sound until stopped (auto-stops after 40 seconds)
 */
export function startAlarmLoop(type: AlarmSoundType = 'siren', volume: number = 0.8): void {
  stopAlarmLoop();

  // Play immediately
  playSoundSample(type, volume);

  // Repeat every 2.4 seconds
  activeLoopInterval = window.setInterval(() => {
    playSoundSample(type, volume);
  }, 2400);

  // Safety cutoff after 40s
  activeTimeoutId = window.setTimeout(() => {
    stopAlarmLoop();
  }, 40000);
}

/**
 * Stop any active repeating alarm sound
 */
export function stopAlarmLoop(): void {
  if (activeLoopInterval !== null) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
  if (activeTimeoutId !== null) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }
}
