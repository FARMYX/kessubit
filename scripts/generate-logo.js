/**
 * Genera el icono de KESUUBIT en PNG sin dependencias externas.
 *
 * Diseño: una púa de guitarra color crema con una corchea rosa, dos anillos
 * orbitales y un destello de píxeles amarillo sobre fondo rosa profundo.
 * El "bit" del nombre se representa con el píxel cuadrado.
 *
 * Uso: node scripts/generate-logo.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 1024;
const SS = 2; // supersampling para bordes suaves
const W = SIZE * SS;

const BG = [201, 58, 114];
const CREAM = [255, 248, 243];
const PINK = [201, 58, 114];
const YELLOW = [242, 194, 48];
const BLUE = [63, 111, 224];
const SHADOW = [142, 36, 80];

const rotate = (x, y, cx, cy, deg) => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
};

const pointInPolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const cubic = (p0, p1, p2, p3, steps = 28) => {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0[0] +
      3 * mt * mt * t * p1[0] +
      3 * mt * t * t * p2[0] +
      t * t * t * p3[0];
    const y =
      mt * mt * mt * p0[1] +
      3 * mt * mt * t * p1[1] +
      3 * mt * t * t * p2[1] +
      t * t * t * p3[1];
    points.push([x, y]);
  }
  return points;
};

// Silueta de la púa: hombros redondeados y punta inferior.
const pickSegments = [
  [[512, 250], [590, 250], [655, 292], [668, 360]],
  [[668, 360], [682, 430], [650, 520], [600, 590]],
  [[600, 590], [560, 646], [530, 710], [512, 775]],
  [[512, 775], [494, 710], [464, 646], [424, 590]],
  [[424, 590], [374, 520], [342, 430], [356, 360]],
  [[356, 360], [369, 292], [434, 250], [512, 250]],
];

const pickPolygon = [];
pickSegments.forEach((segment) => {
  const points = cubic(...segment);
  points.slice(0, -1).forEach(([x, y]) => pickPolygon.push(rotate(x, y, 512, 512, -12)));
});
// Caja contenedora para descartar rápido los píxeles que no tocan la púa.
const pickBox = pickPolygon.reduce(
  (box, [x, y]) => [
    Math.min(box[0], x),
    Math.min(box[1], y),
    Math.max(box[2], x),
    Math.max(box[3], y),
  ],
  [Infinity, Infinity, -Infinity, -Infinity]
);

// Corchea dentro de la púa (coordenadas sin rotar).
const NOTE_HEAD = { cx: 500, cy: 558, rx: 60, ry: 42, angle: -18 };
const noteFlag = cubic([562, 368], [642, 358], [652, 430], [632, 470], 24);
const NOTE_STEM = { x0: 546, y0: 356, x1: 574, y1: 560, r: 14 };

const insideRoundedRect = (x, y, rect) => {
  const cx = Math.max(rect.x0 + rect.r, Math.min(x, rect.x1 - rect.r));
  const cy = Math.max(rect.y0 + rect.r, Math.min(y, rect.y1 - rect.r));
  return (x - cx) ** 2 + (y - cy) ** 2 <= rect.r ** 2;
};

const insideNoteHead = (x, y) => {
  const [rx, ry] = rotate(x, y, NOTE_HEAD.cx, NOTE_HEAD.cy, -NOTE_HEAD.angle);
  return ((rx - NOTE_HEAD.cx) / NOTE_HEAD.rx) ** 2 + ((ry - NOTE_HEAD.cy) / NOTE_HEAD.ry) ** 2 <= 1;
};

const distanceToSegment = (x, y, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};

const insideNoteFlag = (x, y) => {
  for (let i = 0; i < noteFlag.length - 1; i += 1) {
    if (distanceToSegment(x, y, noteFlag[i], noteFlag[i + 1]) <= 14) return true;
  }
  return false;
};

const insideSpark = (x, y) => {
  const squares = [
    [724, 239],
    [724, 211],
    [724, 267],
    [696, 239],
    [752, 239],
  ];
  return squares.some(([sx, sy]) => x >= sx && x <= sx + 22 && y >= sy && y <= sy + 22);
};

const insideDiamond = (x, y, cx, cy, radius) =>
  Math.abs(x - cx) + Math.abs(y - cy) <= radius;

const blend = (buffer, index, color, alpha = 1) => {
  buffer[index] = buffer[index] * (1 - alpha) + color[0] * alpha;
  buffer[index + 1] = buffer[index + 1] * (1 - alpha) + color[1] * alpha;
  buffer[index + 2] = buffer[index + 2] * (1 - alpha) + color[2] * alpha;
};

const render = () => {
  const buffer = new Float32Array(W * W * 3);

  for (let py = 0; py < W; py += 1) {
    const y = (py + 0.5) / SS;
    for (let px = 0; px < W; px += 1) {
      const x = (px + 0.5) / SS;
      const index = (py * W + px) * 3;

      // Fondo con una viñeta muy sutil.
      const distanceFromCenter = Math.hypot(x - 512, y - 512);
      const vignette = 1 - 0.07 * Math.max(0, distanceFromCenter / 512 - 0.25);
      buffer[index] = BG[0] * vignette;
      buffer[index + 1] = BG[1] * vignette;
      buffer[index + 2] = BG[2] * vignette;

      // Trama de puntos (halftone) fuera del emblema.
      const gx = Math.round(x / 64) * 64;
      const gy = Math.round(y / 64) * 64;
      if (
        distanceFromCenter > 300 &&
        distanceFromCenter < 560 &&
        Math.hypot(x - gx, y - gy) <= 3.2
      ) {
        blend(buffer, index, CREAM, 0.055);
      }

      // Anillos orbitales.
      [420, 478].forEach((radius, ringIndex) => {
        const width = ringIndex === 0 ? 5 : 3.5;
        if (Math.abs(distanceFromCenter - radius) <= width / 2) {
          blend(buffer, index, CREAM, 0.17);
        }
      });
      if (Math.hypot(x - 231, y - 899) <= 9) blend(buffer, index, YELLOW, 0.95);

      // Púa: sombra y relleno.
      const inPickBox =
        x >= pickBox[0] - 24 &&
        x <= pickBox[2] + 24 &&
        y >= pickBox[1] - 24 &&
        y <= pickBox[3] + 24;

      if (inPickBox) {
        if (pointInPolygon(x - 10, y - 14, pickPolygon)) {
          blend(buffer, index, SHADOW, 0.22);
        }
        if (pointInPolygon(x, y, pickPolygon)) {
          blend(buffer, index, CREAM, 1);

          // Corchea rosa dentro de la púa, rotada con ella.
          const [nx, ny] = rotate(x, y, 512, 512, 12);
          if (
            insideNoteHead(nx, ny) ||
            insideRoundedRect(nx, ny, NOTE_STEM) ||
            insideNoteFlag(nx, ny)
          ) {
            blend(buffer, index, PINK, 1);
          }
        }
      }

      // Destello de píxeles y acentos.
      if (insideSpark(x, y)) blend(buffer, index, YELLOW, 1);
      if (x >= 286 && x <= 302 && y >= 300 && y <= 316) blend(buffer, index, BLUE, 1);
      if (insideDiamond(x, y, 250, 720, 9)) blend(buffer, index, CREAM, 0.85);
      if (insideDiamond(x, y, 800, 690, 6)) blend(buffer, index, CREAM, 0.7);
    }
  }

  // Downsample SSxSS -> SIZE.
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const index = ((y * SS + sy) * W + (x * SS + sx)) * 3;
          r += buffer[index];
          g += buffer[index + 1];
          b += buffer[index + 2];
        }
      }
      const samples = SS * SS;
      const out = (y * SIZE + x) * 4;
      rgba[out] = Math.round(r / samples);
      rgba[out + 1] = Math.round(g / samples);
      rgba[out + 2] = Math.round(b / samples);
      rgba[out + 3] = 255;
    }
  }
  return rgba;
};

// Codificador PNG mínimo (RGBA, sin filtros) para no depender de librerías.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const encodePng = (rgba) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // profundidad
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const output = path.join(__dirname, '..', 'assets', 'images', 'kesuubit-icon.png');
fs.writeFileSync(output, encodePng(render()));
console.log(`Logo generado en ${output}`);
