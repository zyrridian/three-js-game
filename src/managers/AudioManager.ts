import * as THREE from 'three';

export class AudioManager {
    public listener: THREE.AudioListener;
    public bgmSound: THREE.Audio;
    public punchSound: THREE.Audio;
    public teleportSound: THREE.Audio;

    private audioCtx: AudioContext | null = null;
    private nightOsc: OscillatorNode | null = null;
    private nightGain: GainNode | null = null;

    constructor(camera: THREE.Camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.bgmSound = new THREE.Audio(this.listener);
        this.punchSound = new THREE.Audio(this.listener);
        this.teleportSound = new THREE.Audio(this.listener);
    }

    public loadSounds(onBgmLoaded: () => void) {
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./audio/bgm.mp3', (buffer) => {
            this.bgmSound.setBuffer(buffer);
            this.bgmSound.setLoop(true);
            this.bgmSound.setVolume(0.2);
            onBgmLoaded();
        });
        audioLoader.load('./audio/punch.mp3', (buffer) => {
            this.punchSound.setBuffer(buffer);
            this.punchSound.setVolume(1.0);
        });
        audioLoader.load('./audio/teleport.wav', (buffer) => {
            this.teleportSound.setBuffer(buffer);
            this.teleportSound.setVolume(0.8);
        });
    }

    public initWebAudio() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }

    public playFlashlightSFX() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    public playDialogueBeep() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime); // Pitch for the blip
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime); // Low volume
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    public playKeySFX() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        
        const playDing = (freq: number, delay: number) => {
            if (!this.audioCtx) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.type = 'sine';
            const startTime = this.audioCtx.currentTime + delay;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        };

        // Arpeggio chime
        playDing(880, 0); // A5
        playDing(1108.73, 0.15); // C#6
        playDing(1318.51, 0.3); // E6
    }

    public playSuccessMusic() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        
        // A short triumphant fanfare
        const playNote = (freq: number, start: number, duration: number) => {
            if (!this.audioCtx) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + start);
            gain.gain.setValueAtTime(0, this.audioCtx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + start + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + start + duration);
            osc.start(this.audioCtx.currentTime + start);
            osc.stop(this.audioCtx.currentTime + start + duration);
        };

        playNote(523.25, 0, 0.3); // C5
        playNote(523.25, 0.3, 0.3); // C5
        playNote(523.25, 0.6, 0.3); // C5
        playNote(659.25, 0.9, 1.0); // E5
        playNote(587.33, 1.2, 0.3); // D5
        playNote(698.46, 1.5, 1.5); // F5
    }

    public playTalkSFX(speaker: string) {
        this.initWebAudio();
        if (!this.audioCtx) return;
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        if (speaker === 'Boss') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100 + Math.random() * 50, this.audioCtx.currentTime); // Low pitch
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400 + Math.random() * 200, this.audioCtx.currentTime); // High pitch
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
        }
        
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    public playRobotDeathSFX() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        
        // Chaotic scattering noise
        const bufferSize = this.audioCtx.sampleRate * 1.5; 
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1) * Math.cos(i * 0.03);
        }
        
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 5;
        
        filter.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 1.0);
        
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 1.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        noise.start();
        
        // Low crunch
        const crunch = this.audioCtx.createOscillator();
        const crunchGain = this.audioCtx.createGain();
        crunch.type = 'sawtooth';
        crunch.frequency.setValueAtTime(50, this.audioCtx.currentTime);
        crunch.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.5);
        crunchGain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
        crunchGain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
        
        crunch.connect(crunchGain);
        crunchGain.connect(this.audioCtx.destination);
        crunch.start();
        crunch.stop(this.audioCtx.currentTime + 0.5);
    }

    public playNightBGM() {
        this.initWebAudio();
        if (!this.audioCtx) return;
        if (this.nightOsc) return;
        this.nightOsc = this.audioCtx.createOscillator();
        this.nightGain = this.audioCtx.createGain();

        this.nightOsc.type = 'triangle';
        this.nightOsc.frequency.setValueAtTime(110, this.audioCtx.currentTime);

        const pitchLFO = this.audioCtx.createOscillator();
        pitchLFO.type = 'sine';
        pitchLFO.frequency.value = 0.2;
        const pitchLFOGain = this.audioCtx.createGain();
        pitchLFOGain.gain.value = 5;
        pitchLFO.connect(pitchLFOGain);
        pitchLFOGain.connect(this.nightOsc.frequency);
        pitchLFO.start();

        const volLFO = this.audioCtx.createOscillator();
        volLFO.type = 'sine';
        volLFO.frequency.value = 0.05;
        const volLFOGain = this.audioCtx.createGain();
        volLFOGain.gain.value = 0.15;
        volLFO.connect(volLFOGain);
        volLFOGain.connect(this.nightGain.gain);
        volLFO.start();

        this.nightOsc.connect(this.nightGain);
        this.nightGain.connect(this.audioCtx.destination);

        this.nightGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.nightGain.gain.linearRampToValueAtTime(0.15, this.audioCtx.currentTime + 3);

        this.nightOsc.start();
    }

    public stopNightBGM() {
        if (this.nightOsc && this.nightGain && this.audioCtx) {
            this.nightGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
            this.nightGain.gain.setValueAtTime(this.nightGain.gain.value, this.audioCtx.currentTime);
            this.nightGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.05);
            this.nightOsc.stop(this.audioCtx.currentTime + 0.1);
            this.nightOsc = null;
            this.nightGain = null;
        }
    }

    public toggleFlashlightBGM(isFlashlightOn: boolean) {
        if (!this.audioCtx || !this.nightGain) return;
        this.nightGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.nightGain.gain.setValueAtTime(this.nightGain.gain.value, this.audioCtx.currentTime);
        if (isFlashlightOn) {
            this.nightGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);
        } else {
            this.nightGain.gain.linearRampToValueAtTime(0.15, this.audioCtx.currentTime + 2);
        }
    }
}
