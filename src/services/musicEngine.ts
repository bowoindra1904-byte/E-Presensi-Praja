// Web Audio Synthesizer & Audio Player Engine for SI-PRAJA Satpol PP Bangka Barat

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  genre: 'Mars Kedinasan' | 'Hymne' | 'Lagu Patriotik' | 'Lagu Daerah' | 'Apel & Upacara' | 'Instrumen Santai' | 'Audio Khusus';
  durationSeconds: number;
  description: string;
  lyrics?: string[];
  isCustom?: boolean;
  audioUrl?: string; // If loaded from file/URL
}

export const PRESET_TRACKS: TrackInfo[] = [
  {
    id: 'mars-satpol-pp',
    title: 'Mars Satpol PP & Defile Pasukan (Orkestra Band Kedinasan)',
    artist: 'Korps Satpol PP & Orkestra Korps Musik Militer',
    genre: 'Mars Kedinasan',
    durationSeconds: 185,
    description: 'Mars resmi bernuansa derap langkah disiplin, marching brass orkestra, dan drum band penegak Perda.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/National_Emblem_%28Bagley%29_-_United_States_Army_Band.ogg',
    lyrics: [
      'Polisi Pamong Praja Praja Wibawa',
      'Pengawal Peraturan Daerah perkasa',
      'Menjaga ketertiban ketenteraman warga',
      'Ikhlas mengabdi demi nusa dan bangsa',
      'Satpol PP teguh melangkah maju',
      'Bina ketenteraman masyarakat selalu',
      'Berdasar Pancasila UUD Empat Lima',
      'Maju terus pantang mundur Praja Wibawa!'
    ]
  },
  {
    id: 'hymne-satpol-pp',
    title: 'Lagu Kebangsaan Indonesia Raya (Orkestra Penuh Simfoni)',
    artist: 'Lagu Kebangsaan Republik Indonesia - US Navy Band Performance',
    genre: 'Hymne',
    durationSeconds: 109,
    description: 'Lagu kebangsaan resmi dalam aransemen simfoni orkestra tiup khidmat untuk upacara bendera dan apel kedinasan.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Indonesia_Raya_instrumental.ogg',
    lyrics: [
      'Indonesia tanah airku, tanah tumpah darahku',
      'Di sanalah aku berdiri, jadi pandu ibuku',
      'Indonesia kebangsaanku, bangsa dan tanah airku',
      'Marilah kita berseru: Indonesia bersatu!',
      'Hiduplah tanahku, hiduplah negeriku, bangsaku, rakyatku, semuanya',
      'Bangunlah jiwanya, bangunlah badannya untuk Indonesia Raya!'
    ]
  },
  {
    id: 'mars-bela-negara',
    title: 'Mars Disiplin Korps Praja (Semper Fidelis March)',
    artist: 'Korps Musik Kedinasan & Marching Band Pasukan',
    genre: 'Lagu Patriotik',
    durationSeconds: 168,
    description: 'Derap langkah penuh patriotisme, ketegasan praja wibawa dalam mengawal ketertiban umum.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Semper_Fidelis_March_%281909%29.ogg'
  },
  {
    id: 'genderang-apel',
    title: 'Terompet Fanfare & Genderang Apel Komando',
    artist: 'Protokol Pasukan Satpol PP',
    genre: 'Apel & Upacara',
    durationSeconds: 48,
    description: 'Fanfare tiupan terompet komando dan drum roll genderang resmi pembuka apel pagi dan serah terima piket.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Four_ruffles_and_flourishes_and_Hail_to_the_Chief_%28long_version%29.ogg'
  },
  {
    id: 'serumpun-sebalai',
    title: 'Alunan Khidmat Pesisir Melayu (Serumpun Sebalai Bangka Barat)',
    artist: 'Instrumen Kedinasan & Budaya Lokal',
    genre: 'Lagu Daerah',
    durationSeconds: 195,
    description: 'Alunan lembut mencerminkan kedamaian dan kearifan lokal tanah Bangka Barat nan tenteram.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Gymnopedie_No._1.ogg'
  },
  {
    id: 'santai-piket',
    title: 'Instrumen Ketenangan Pos Jaga & Command Center',
    artist: 'Harmoni Akustik Piano & Strings',
    genre: 'Instrumen Santai',
    durationSeconds: 210,
    description: 'Musik tenang untuk menemani penyusunan laporan harian dan piket malam pos komando.',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Gymnopedie_No._1.ogg'
  }
];

type NoteEvent = { note: number; duration: number; type?: 'melody' | 'bass' | 'harmony' | 'snare' };

// Note Frequency Mapping
const NOTE = {
  REST: 0,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50
};

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private playlist: TrackInfo[] = [...PRESET_TRACKS];
  private volume: number = 0.65;
  private isMuted: boolean = false;
  private isLooping: boolean = false;
  private activeNodes: (AudioNode | number)[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private playbackTimer: number | null = null;
  private currentTime: number = 0;
  private listeners: Set<() => void> = new Set();
  private visualizerDataArray: Uint8Array | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.visualizerDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getTracks(): TrackInfo[] {
    return this.playlist;
  }

  public getCurrentTrack(): TrackInfo {
    return this.playlist[this.currentTrackIndex] || this.playlist[0];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsLooping(): boolean {
    return this.isLooping;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.muted = this.isMuted;
    }
    this.notify();
  }

  public toggleLoop() {
    this.isLooping = !this.isLooping;
    this.notify();
  }

  public async playTrack(index: number) {
    this.initAudio();
    if (index < 0 || index >= this.playlist.length) return;
    this.stopInternal();
    this.currentTrackIndex = index;
    this.currentTime = 0;
    this.isPlaying = true;
    this.notify();

    const track = this.playlist[index];

    if (track.audioUrl) {
      // Play custom uploaded MP3 / stream
      this.playHtmlAudio(track.audioUrl);
    } else {
      // Play procedural synth track
      this.playProceduralTrack(track.id);
    }

    // Start progress timer
    this.startProgressTicker();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.playTrack(this.currentTrackIndex);
    }
  }

  public pause() {
    this.isPlaying = false;
    this.stopInternal();
    this.notify();
  }

  public nextTrack() {
    let nextIdx = this.currentTrackIndex + 1;
    if (nextIdx >= this.playlist.length) {
      nextIdx = 0;
    }
    this.playTrack(nextIdx);
  }

  public prevTrack() {
    let prevIdx = this.currentTrackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.playlist.length - 1;
    }
    this.playTrack(prevIdx);
  }

  public addCustomTrack(file: File) {
    const url = URL.createObjectURL(file);
    const customTrack: TrackInfo = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Audio Pribadi Satpol PP',
      genre: 'Audio Khusus',
      durationSeconds: 180,
      description: 'File audio lokal yang diunggah dari perangkat komando / dinas.',
      isCustom: true,
      audioUrl: url
    };

    this.playlist.unshift(customTrack);
    this.playTrack(0);
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyser || !this.visualizerDataArray) {
      return new Uint8Array(16);
    }
    this.analyser.getByteFrequencyData(this.visualizerDataArray as any);
    return this.visualizerDataArray;
  }

  private stopInternal() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    // Clear scheduled Web Audio timers
    this.activeNodes.forEach(node => {
      if (typeof node === 'number') {
        clearTimeout(node);
      } else {
        try {
          (node as AudioScheduledSourceNode).stop?.();
          node.disconnect?.();
        } catch {
          // ignore
        }
      }
    });
    this.activeNodes = [];
  }

  private playHtmlAudio(url: string) {
    try {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.volume = this.isMuted ? 0 : this.volume;
      this.audioElement = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          const track = this.getCurrentTrack();
          track.durationSeconds = Math.round(audio.duration);
          this.notify();
        }
      };

      audio.onended = () => {
        if (this.isLooping) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          this.nextTrack();
        }
      };

      audio.onerror = (e) => {
        console.warn('HTML Audio fallback:', e);
        const track = this.getCurrentTrack();
        this.playProceduralTrack(track.id);
      };

      audio.play().catch((err) => {
        console.warn('HTML Audio play error:', err);
      });
    } catch (e) {
      console.warn('HTML Audio play error', e);
    }
  }

  private startProgressTicker() {
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    this.playbackTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      const track = this.getCurrentTrack();
      if (this.audioElement) {
        this.currentTime = Math.floor(this.audioElement.currentTime);
      } else {
        this.currentTime += 1;
        if (this.currentTime >= track.durationSeconds) {
          if (this.isLooping) {
            this.playTrack(this.currentTrackIndex);
          } else {
            this.nextTrack();
          }
          return;
        }
      }
      this.notify();
    }, 1000);
  }

  // Synthesis engine for guaranteed zero-drop offline playback
  private playProceduralTrack(trackId: string) {
    if (!this.ctx || !this.masterGain) return;

    switch (trackId) {
      case 'mars-satpol-pp':
        this.synthesizeMarsSatpolPP();
        break;
      case 'hymne-satpol-pp':
        this.synthesizeHymneSatpolPP();
        break;
      case 'mars-bela-negara':
        this.synthesizeMarsBelaNegara();
        break;
      case 'serumpun-sebalai':
        this.synthesizeSerumpunSebalai();
        break;
      case 'genderang-apel':
        this.synthesizeGenderangApel();
        break;
      case 'santai-piket':
        this.synthesizeSantaiPiket();
        break;
      default:
        this.synthesizeMarsSatpolPP();
    }
  }

  // Play a single brass/synth note
  private scheduleNote(
    freq: number,
    startTime: number,
    duration: number,
    type: 'brass' | 'strings' | 'bass' | 'flute' = 'brass',
    volumeMultiplier: number = 0.25
  ) {
    if (!this.ctx || !this.masterGain || freq <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'brass') {
        osc.type = 'triangle';
      } else if (type === 'strings') {
        osc.type = 'sine';
      } else if (type === 'bass') {
        osc.type = 'sine';
      } else {
        osc.type = 'sine';
      }

      osc.frequency.setValueAtTime(freq, startTime);

      // Lowpass filter for warm acoustic timbre
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'brass' ? 550 : 450, startTime);

      // Envelope ADSR
      const safeVol = Math.min(0.12, volumeMultiplier * 0.5);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(safeVol, startTime + 0.08);
      gain.gain.setValueAtTime(safeVol * 0.7, startTime + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      this.activeNodes.push(osc);
    } catch {
      // audio error handling
    }
  }

  // Drum cadence / snare noise burst for march tempo
  private scheduleSnare(startTime: number, volumeMultiplier: number = 0.05) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Noise buffer for snappy snare sound
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, startTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(startTime);
      whiteNoise.stop(startTime + 0.09);
      this.activeNodes.push(whiteNoise);

      // Kick thud under snare
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, startTime);
      osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.07);

      oscGain.gain.setValueAtTime(volumeMultiplier * 1.2, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.08);
      this.activeNodes.push(osc);
    } catch {
      // ignore
    }
  }

  // 1. Synthesize Mars Satpol PP: Praja Wibawa
  private synthesizeMarsSatpolPP() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 0.51; // 118 BPM march

    // Mars melody sequence (Lead Trumpet / Brass)
    const melody: NoteEvent[] = [
      // Verse 1: Polisi Pamong Praja
      { note: NOTE.C4, duration: beat },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.A4, duration: beat * 0.75 },
      { note: NOTE.G4, duration: beat * 0.25 },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.C4, duration: beat },

      // Pengawal Peraturan Daerah perkasa
      { note: NOTE.D4, duration: beat },
      { note: NOTE.F4, duration: beat },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat * 1.5 },
      { note: NOTE.F4, duration: beat * 0.5 },
      { note: NOTE.E4, duration: beat * 2 },

      // Menjaga ketertiban ketenteraman warga
      { note: NOTE.G4, duration: beat },
      { note: NOTE.C5, duration: beat * 1.5 },
      { note: NOTE.B4, duration: beat * 0.5 },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.F4, duration: beat },
      { note: NOTE.E4, duration: beat },

      // Ikhlas mengabdi demi nusa dan bangsa
      { note: NOTE.D4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.B4, duration: beat },
      { note: NOTE.C5, duration: beat * 2.5 },

      // Chorus / Refrain: Maju terus pantang mundur
      { note: NOTE.C5, duration: beat },
      { note: NOTE.C5, duration: beat * 0.75 },
      { note: NOTE.B4, duration: beat * 0.25 },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.F4, duration: beat },
      { note: NOTE.G4, duration: beat * 2 },

      // Satpol PP Praja Wibawa
      { note: NOTE.E4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.C5, duration: beat },
      { note: NOTE.E5, duration: beat * 1.5 },
      { note: NOTE.D5, duration: beat * 0.5 },
      { note: NOTE.C5, duration: beat * 3 }
    ];

    // Play melody with looping loops
    const totalBars = 36;
    for (let rep = 0; rep < 2; rep++) {
      let t = now + rep * melody.reduce((acc, m) => acc + m.duration, 0);
      melody.forEach(item => {
        this.scheduleNote(item.note, t, item.duration * 0.9, 'brass', 0.28);
        // Harmony overtone
        if (item.note > 0) {
          this.scheduleNote(item.note * 0.5, t, item.duration * 0.9, 'bass', 0.2);
        }
        t += item.duration;
      });
    }

    // Marching Cadence (Snare & Bass Drum on beats)
    for (let b = 0; b < totalBars * 2; b++) {
      const snareTime = now + b * beat;
      // Snare on beat 2 & 4, roll on every measure end
      this.scheduleSnare(snareTime, 0.16);
      if (b % 4 === 3) {
        this.scheduleSnare(snareTime + beat * 0.5, 0.12);
        this.scheduleSnare(snareTime + beat * 0.75, 0.14);
      }
    }
  }

  // 2. Synthesize Hymne Satpol PP (Solemn 3/4 time)
  private synthesizeHymneSatpolPP() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 0.76;

    const melody: NoteEvent[] = [
      { note: NOTE.E4, duration: beat },
      { note: NOTE.G4, duration: beat * 2 },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat * 2 },
      { note: NOTE.C4, duration: beat },
      { note: NOTE.E4, duration: beat * 2 },
      { note: NOTE.D4, duration: beat * 3 },

      { note: NOTE.D4, duration: beat },
      { note: NOTE.F4, duration: beat * 2 },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.F4, duration: beat * 2 },
      { note: NOTE.D4, duration: beat },
      { note: NOTE.E4, duration: beat * 2 },
      { note: NOTE.C4, duration: beat * 3 },

      // Climax
      { note: NOTE.G4, duration: beat },
      { note: NOTE.C5, duration: beat * 2 },
      { note: NOTE.B4, duration: beat },
      { note: NOTE.A4, duration: beat * 2 },
      { note: NOTE.F4, duration: beat },
      { note: NOTE.G4, duration: beat * 3 },

      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat * 2 },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.D4, duration: beat * 2 },
      { note: NOTE.B3, duration: beat },
      { note: NOTE.C4, duration: beat * 4 }
    ];

    let t = now;
    melody.forEach(item => {
      this.scheduleNote(item.note, t, item.duration * 0.95, 'strings', 0.26);
      if (item.note > 0) {
        this.scheduleNote(item.note * 0.5, t, item.duration * 0.95, 'bass', 0.18);
        this.scheduleNote(item.note * 1.5, t, item.duration * 0.95, 'flute', 0.12);
      }
      t += item.duration;
    });
  }

  // 3. Mars Bela Negara
  private synthesizeMarsBelaNegara() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 0.5;

    const melody: NoteEvent[] = [
      { note: NOTE.G4, duration: beat },
      { note: NOTE.C5, duration: beat * 1.5 },
      { note: NOTE.D5, duration: beat * 0.5 },
      { note: NOTE.E5, duration: beat },
      { note: NOTE.C5, duration: beat },
      { note: NOTE.D5, duration: beat * 1.5 },
      { note: NOTE.B4, duration: beat * 0.5 },
      { note: NOTE.G4, duration: beat * 2 },

      { note: NOTE.A4, duration: beat },
      { note: NOTE.F4, duration: beat * 1.5 },
      { note: NOTE.A4, duration: beat * 0.5 },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.D4, duration: beat * 2 },
      { note: NOTE.C4, duration: beat * 2 }
    ];

    for (let rep = 0; rep < 2; rep++) {
      let t = now + rep * 16 * beat;
      melody.forEach(item => {
        this.scheduleNote(item.note, t, item.duration * 0.9, 'brass', 0.26);
        t += item.duration;
      });
    }

    for (let b = 0; b < 32; b++) {
      this.scheduleSnare(now + b * beat, 0.18);
    }
  }

  // 4. Lagu Daerah Bangka Belitung: Serumpun Sebalai
  private synthesizeSerumpunSebalai() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 0.62;

    const melody: NoteEvent[] = [
      { note: NOTE.E4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.A4, duration: beat * 1.5 },
      { note: NOTE.C5, duration: beat * 0.5 },
      { note: NOTE.A4, duration: beat },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.E4, duration: beat * 2 },

      { note: NOTE.D4, duration: beat },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.G4, duration: beat * 1.5 },
      { note: NOTE.A4, duration: beat * 0.5 },
      { note: NOTE.G4, duration: beat },
      { note: NOTE.E4, duration: beat },
      { note: NOTE.D4, duration: beat * 2 },

      { note: NOTE.C4, duration: beat },
      { note: NOTE.D4, duration: beat },
      { note: NOTE.E4, duration: beat * 1.5 },
      { note: NOTE.G4, duration: beat * 0.5 },
      { note: NOTE.A4, duration: beat * 1.5 },
      { note: NOTE.G4, duration: beat * 0.5 },
      { note: NOTE.C4, duration: beat * 3 }
    ];

    for (let rep = 0; rep < 2; rep++) {
      let t = now + rep * 18 * beat;
      melody.forEach(item => {
        this.scheduleNote(item.note, t, item.duration * 0.92, 'flute', 0.28);
        this.scheduleNote(item.note * 0.5, t, item.duration * 0.8, 'strings', 0.18);
        t += item.duration;
      });
    }
  }

  // 5. Genderang & Terompet Siaga Apel Komando
  private synthesizeGenderangApel() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 0.42;

    // Drum rolls
    for (let i = 0; i < 24; i++) {
      this.scheduleSnare(now + i * (beat * 0.5), 0.2);
    }

    // Trumpet call to attention
    const callTime = now + 12 * (beat * 0.5);
    const trumpetCall = [
      { note: NOTE.G4, duration: beat * 0.5 },
      { note: NOTE.C5, duration: beat * 0.5 },
      { note: NOTE.E5, duration: beat * 0.5 },
      { note: NOTE.G5, duration: beat * 1.5 },
      { note: NOTE.E5, duration: beat * 0.5 },
      { note: NOTE.G5, duration: beat * 2 }
    ];

    let t = callTime;
    trumpetCall.forEach(item => {
      this.scheduleNote(item.note, t, item.duration * 0.9, 'brass', 0.35);
      t += item.duration;
    });
  }

  // 6. Alunan Relaksasi Harmoni Pos Dinas
  private synthesizeSantaiPiket() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.1;
    const beat = 1.0;

    const chords = [
      [NOTE.C4, NOTE.E4, NOTE.G4],
      [NOTE.A3, NOTE.C4, NOTE.E4],
      [NOTE.F3, NOTE.A3, NOTE.C4],
      [NOTE.G3, NOTE.B3, NOTE.D4]
    ];

    let t = now;
    for (let round = 0; round < 4; round++) {
      chords.forEach(chord => {
        chord.forEach(note => {
          this.scheduleNote(note, t, beat * 2.8, 'strings', 0.16);
          this.scheduleNote(note * 2, t + 0.2, beat * 1.5, 'flute', 0.12);
        });
        t += beat * 3;
      });
    }
  }
}

// Export singleton instance
export const musicEngine = new MusicEngine();
