/**
 * Genera los seis sonidos propios de KESUUBIT como WAV mono de 16 bits.
 * Síntesis 100% Node (sin dependencias): cuerda pulsada cálida con armónicos
 * que decaen a distinta velocidad, una capa levemente desafinada y una pizca
 * filtrada. Toda la paleta está en Sol mayor para que suene como un mismo
 * instrumento de indie-rock/anime, no como pitidos electrónicos.
 *
 * Uso: node scripts/generate-sounds.mjs
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'sounds');
const RATE = 44100;
const TAU = Math.PI * 2;

// Volumen consistente entre sonidos, sin acercarse al clipping.
const TARGET_RMS = 0.105; // ~ -19.6 dBFS
const PEAK_CEILING = 0.72; // ~ -2.9 dBFS

// Acorde de Sol mayor y sus extensiones: toda la paleta usa estas notas.
const G3 = 196.0;
const D4 = 293.66;
const G4 = 392.0;
const B4 = 493.88;
const D5 = 587.33;
const G5 = 783.99;

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

function smoothstep01(x) {
  const v = Math.max(0, Math.min(1, x));
  return v * v * (3 - 2 * v);
}

/**
 * Cuerda pulsada: armónicos con inharmonicidad suave y decay propio (los
 * agudos mueren antes), una segunda voz desafinada que da cuerpo y una pizca
 * de ruido filtrado. Ataque de 12 ms y salida desvanecida: sin clics.
 */
function pluck(freq, { start = 0, duration = 0.5, gain = 1, decay = 0.25, pick = 0.05, bend = 0, seed = 1 }) {
  const length = Math.floor(RATE * duration);
  const samples = new Float32Array(length);
  const random = rng(seed);
  const harmonics = [1, 0.42, 0.19, 0.085, 0.04];
  const phases = harmonics.map((_, i) => ((seed * (i + 3) * 0.6180339887) % 1) * TAU);
  const noiseCoeff = 1 - Math.exp((-TAU * 2200) / RATE);
  let noiseLp = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    const attack = smoothstep01(t / 0.012);
    const release = smoothstep01((duration - t) / 0.045);
    const vibrato = 1 + 0.0016 * Math.sin(TAU * 5.4 * t) * smoothstep01(t / 0.05);
    const pitch = freq * (1 + bend * Math.exp(-t / 0.07)) * vibrato;

    let value = 0;
    for (let h = 0; h < harmonics.length; h += 1) {
      const partial = h + 1;
      const inharmonic = 1 + 0.0009 * partial * partial;
      const partialDecay = decay / (1 + 0.55 * h);
      value += Math.sin(TAU * pitch * partial * inharmonic * t + phases[h])
        * harmonics[h] * Math.exp(-t / partialDecay);
    }
    // Segunda capa casi al unísono: cuerpo de instrumento acústico, no beep.
    value += 0.3 * Math.sin(TAU * pitch * 1.0035 * t + phases[0] * 0.7) * Math.exp(-t / (decay * 0.75));
    value += 0.12 * Math.sin(TAU * pitch * 2.006 * t + phases[1] * 0.5) * Math.exp(-t / (decay * 0.45));

    if (t < 0.02) {
      noiseLp += noiseCoeff * (random() - noiseLp);
      value += pick * noiseLp * smoothstep01(t / 0.002) * Math.exp(-t / 0.005);
    }
    samples[i] = value * gain * attack * release;
  }
  return { start, samples };
}

/** "Sello" suave: golpe grave con tono que baja y ruido muy filtrado. */
function stamp({ start = 0, duration = 0.15, gain = 1, seed = 7 }) {
  const length = Math.floor(RATE * duration);
  const samples = new Float32Array(length);
  const random = rng(seed);
  const noiseCoeff = 1 - Math.exp((-TAU * 1100) / RATE);
  let noiseLp = 0;
  let phase = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    const attack = smoothstep01(t / 0.005);
    const release = smoothstep01((duration - t) / 0.035);
    phase += (TAU * (82 + 105 * Math.exp(-t / 0.026))) / RATE;
    noiseLp += noiseCoeff * (random() - noiseLp);
    const value = Math.sin(phase) * Math.exp(-t / 0.045) + 0.5 * noiseLp * Math.exp(-t / 0.018);
    samples[i] = value * gain * attack * release;
  }
  return { start, samples };
}

function render(duration, voices) {
  const length = Math.floor(RATE * duration);
  const mixed = new Float32Array(length);

  for (const voice of voices) {
    const offset = Math.round(voice.start * RATE);
    for (let i = 0; i < voice.samples.length && offset + i < length; i += 1) {
      mixed[offset + i] += voice.samples[i];
    }
  }

  // Filtro suave global: redondea los ataques y quita agudos ásperos.
  const smoothCoeff = 1 - Math.exp((-TAU * 4200) / RATE);
  let smooth = 0;
  for (let i = 0; i < length; i += 1) {
    smooth += smoothCoeff * (mixed[i] - smooth);
    mixed[i] = smooth;
  }

  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    sumSq += mixed[i] * mixed[i];
    peak = Math.max(peak, Math.abs(mixed[i]));
  }
  const rms = Math.sqrt(sumSq / length) || 1;
  const scale = Math.min(TARGET_RMS / rms, PEAK_CEILING / peak);

  const buffer = Buffer.alloc(length * 2);
  const fadeSamples = Math.round(RATE * 0.02);
  for (let i = 0; i < length; i += 1) {
    const fade = Math.min(1, (length - 1 - i) / fadeSamples);
    const pcm = Math.max(-1, Math.min(1, mixed[i] * scale * fade));
    buffer.writeInt16LE(Math.round(pcm * 32767), i * 2);
  }
  return buffer;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function measure(pcm) {
  const count = pcm.length / 2;
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < count; i += 1) {
    const sample = pcm.readInt16LE(i * 2) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    sumSq += sample * sample;
  }
  return {
    peakDb: (20 * Math.log10(peak)).toFixed(1),
    rmsDb: (20 * Math.log10(Math.sqrt(sumSq / count))).toFixed(1),
  };
}

const SOUNDS = {
  // Neutro: acorde abierto G-D, campana cálida y breve.
  // Android solo acepta a-z, 0-9 y guion bajo en nombres de recursos.
  'kessoku_chime.wav': render(0.72, [
    pluck(G4, { duration: 0.68, gain: 0.9, decay: 0.24, seed: 11 }),
    pluck(D5, { start: 0.1, duration: 0.52, gain: 0.34, decay: 0.19, seed: 12 }),
  ]),
  // Neutro: pizca corta y redonda, con cuerpo grave.
  'kessoku-pop.wav': render(0.3, [
    pluck(B4, { duration: 0.28, gain: 0.82, decay: 0.085, pick: 0.08, seed: 21 }),
    pluck(G3, { duration: 0.22, gain: 0.28, decay: 0.06, pick: 0.02, seed: 22 }),
  ]),
  // Éxito: arpeggio ascendente G-B-D-G que resuelve luminoso.
  'kessoku-success.wav': render(0.86, [
    pluck(G4, { duration: 0.55, gain: 0.85, decay: 0.2, seed: 31 }),
    pluck(B4, { start: 0.1, duration: 0.55, gain: 0.8, decay: 0.2, seed: 32 }),
    pluck(D5, { start: 0.2, duration: 0.6, gain: 0.78, decay: 0.22, seed: 33 }),
    pluck(G5, { start: 0.3, duration: 0.5, gain: 0.4, decay: 0.19, seed: 34 }),
  ]),
  // Verificación: confirmación ascendente más corta D-G-B.
  'kessoku-verify.wav': render(0.58, [
    pluck(D4, { duration: 0.4, gain: 0.8, decay: 0.13, seed: 41 }),
    pluck(G4, { start: 0.09, duration: 0.45, gain: 0.82, decay: 0.16, seed: 42 }),
    pluck(B4, { start: 0.18, duration: 0.36, gain: 0.7, decay: 0.14, seed: 43 }),
  ]),
  // Oferta: dos notas curiosas (tercera menor descendente con leve gliss).
  'kessoku-offer.wav': render(0.56, [
    pluck(D5, { duration: 0.36, gain: 0.8, decay: 0.15, seed: 51 }),
    pluck(B4, { start: 0.16, duration: 0.38, gain: 0.78, decay: 0.16, bend: -0.018, seed: 52 }),
  ]),
  // Recibo: sello suave sobre una nota grave de Sol, sin golpe seco.
  'kessoku-receipt.wav': render(0.36, [
    stamp({ duration: 0.15, gain: 0.5, seed: 61 }),
    pluck(G3, { start: 0.012, duration: 0.33, gain: 0.8, decay: 0.12, pick: 0.025, seed: 62 }),
    pluck(D4, { start: 0.05, duration: 0.24, gain: 0.22, decay: 0.09, seed: 63 }),
  ]),
};

mkdirSync(OUT, { recursive: true });
for (const [name, pcm] of Object.entries(SOUNDS)) {
  const file = wav(pcm);
  writeFileSync(join(OUT, name), file);
  const { peakDb, rmsDb } = measure(pcm);
  console.log(
    `${name} · ${(pcm.length / 2 / RATE).toFixed(2)} s · pico ${peakDb} dBFS`
    + ` · RMS ${rmsDb} dBFS · ${(file.length / 1024).toFixed(1)} KB`,
  );
}
