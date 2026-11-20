/**
 * Genera los sonidos propios de KESUUBIT como WAV mono de 16 bits.
 * No depende de librerías: sintetiza un pulso de cuerda con armónicos y
 * envolvente de ataque corto + caída exponencial.
 *
 * Uso: node scripts/generate-sounds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'sounds');
const RATE = 44100;

const TAU = Math.PI * 2;

function pluck(freq, start, duration, gain, decay, harmonics = [1, 0.32, 0.14]) {
  return (t) => {
    const local = t - start;
    if (local < 0 || local > duration) return 0;
    const attack = Math.min(1, local / 0.006);
    const env = attack * Math.exp(-local / decay);
    let sample = 0;
    harmonics.forEach((amp, index) => {
      const harmonic = index + 1;
      // Los armónicos se desafinan un poco: suena a cuerda, no a onda senoidal.
      const detune = 1 + harmonic * 0.0007;
      sample += Math.sin(TAU * freq * harmonic * detune * local) * amp;
    });
    return sample * env * gain;
  };
}

function noiseClick(start, duration, gain) {
  let seed = 12345;
  return (t) => {
    const local = t - start;
    if (local < 0 || local > duration) return 0;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const white = (seed / 0x7fffffff) * 2 - 1;
    return white * Math.exp(-local / 0.018) * gain;
  };
}

function render(duration, voices) {
  const length = Math.floor(RATE * duration);
  const buffer = Buffer.alloc(length * 2);
  const peak = voices.reduce((max, voice) => {
    for (let i = 0; i < length; i += 1) {
      max = Math.max(max, Math.abs(voice(i / RATE)));
    }
    return max;
  }, 0) || 1;
  const normalise = 0.82 / peak;

  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    const value = voices.reduce((sum, voice) => sum + voice(t), 0) * normalise;
    const tail = Math.min(1, (length - i) / (RATE * 0.012));
    const pcm = Math.max(-1, Math.min(1, value * Math.max(0, tail)));
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

const SOUNDS = {
  // Confirmación de pago: acorde menor->mayor, resuelve hacia arriba.
  'kessoku-verify.wav': render(0.62, [
    pluck(440, 0, 0.28, 0.7, 0.11),
    pluck(554.37, 0.075, 0.3, 0.6, 0.12),
    pluck(659.25, 0.15, 0.46, 0.72, 0.19),
  ]),
  // Oferta / bajada de precio: tres notas brillantes y cortas.
  'kessoku-offer.wav': render(0.5, [
    pluck(659.25, 0, 0.22, 0.62, 0.08, [1, 0.24, 0.08]),
    pluck(830.61, 0.09, 0.24, 0.58, 0.09, [1, 0.24, 0.08]),
    pluck(987.77, 0.18, 0.32, 0.66, 0.13, [1, 0.24, 0.08]),
  ]),
  // Recibo: golpe suave de "sello" sobre una nota grave.
  'kessoku-receipt.wav': render(0.34, [
    noiseClick(0, 0.14, 0.42),
    pluck(329.63, 0.02, 0.3, 0.62, 0.1, [1, 0.2]),
  ]),
};

mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(SOUNDS)) {
  const file = wav(data);
  writeFileSync(join(OUT, name), file);
  console.log(`${name} · ${(file.length / 1024).toFixed(1)} KB`);
}
