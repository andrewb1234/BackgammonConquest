/**
 * Lightweight sound system using Web Audio API.
 * Generates procedural sounds — no external audio files needed.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  source.connect(gain);
  gain.connect(c.destination);
  source.start(c.currentTime);
}

// ---------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------

export function playDiceRoll() {
  // Short rattle sound
  playNoise(0.08, 0.12);
  setTimeout(() => playNoise(0.06, 0.08), 60);
  setTimeout(() => playTone(800, 0.1, "square", 0.06), 120);
}

export function playHit() {
  // Impact thud
  playNoise(0.1, 0.15);
  playTone(150, 0.15, "sine", 0.12);
}

export function playMove() {
  // Soft click
  playTone(600, 0.05, "sine", 0.08);
}

export function playEscalation() {
  // Rising alarm
  playTone(400, 0.15, "sawtooth", 0.08);
  setTimeout(() => playTone(600, 0.15, "sawtooth", 0.08), 100);
  setTimeout(() => playTone(800, 0.2, "sawtooth", 0.1), 200);
}

export function playVictory() {
  // Ascending fanfare
  playTone(523, 0.15, "square", 0.1);
  setTimeout(() => playTone(659, 0.15, "square", 0.1), 120);
  setTimeout(() => playTone(784, 0.25, "square", 0.12), 240);
}

export function playDefeat() {
  // Descending tone
  playTone(400, 0.2, "sine", 0.1);
  setTimeout(() => playTone(300, 0.2, "sine", 0.1), 180);
  setTimeout(() => playTone(200, 0.4, "sine", 0.08), 360);
}

export function playItemUse() {
  // Sci-fi blip
  playTone(1200, 0.08, "sine", 0.1);
  setTimeout(() => playTone(1600, 0.1, "sine", 0.08), 60);
}
