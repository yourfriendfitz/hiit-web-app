import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUTPUT_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const BASE_SIZE = 512;
const SUPERSAMPLE = 4;

const colors = {
  background: [9, 14, 18, 255],
  handle: [221, 255, 236, 255],
  plate: [69, 212, 131, 255],
  shadow: [0, 0, 0, 82],
};

const pngTargets = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["android-chrome-192x192.png", 192],
  ["android-chrome-512x512.png", 512],
];

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BASE_SIZE} ${BASE_SIZE}">
  <rect width="${BASE_SIZE}" height="${BASE_SIZE}" fill="#090e12"/>
  <g transform="translate(256 256) rotate(-14) translate(-256 -256)">
    <g opacity=".32" transform="translate(10 14)" fill="#000">
      <rect x="86" y="184" width="52" height="144" rx="18"/>
      <rect x="142" y="204" width="46" height="104" rx="16"/>
      <rect x="324" y="204" width="46" height="104" rx="16"/>
      <rect x="374" y="184" width="52" height="144" rx="18"/>
      <rect x="176" y="236" width="160" height="40" rx="20"/>
    </g>
    <g fill="#45d483">
      <rect x="86" y="184" width="52" height="144" rx="18"/>
      <rect x="142" y="204" width="46" height="104" rx="16"/>
      <rect x="324" y="204" width="46" height="104" rx="16"/>
      <rect x="374" y="184" width="52" height="144" rx="18"/>
    </g>
    <rect x="176" y="236" width="160" height="40" rx="20" fill="#ddffec"/>
  </g>
</svg>
`;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])),
    chunk.length - 4,
  );
  return chunk;
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND"),
  ]);
}

function rotatePoint(x, y, angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const dx = x - 256;
  const dy = y - 256;

  return {
    x: 256 + dx * cos - dy * sin,
    y: 256 + dx * sin + dy * cos,
  };
}

function inRoundedRect(x, y, left, top, width, height, radius) {
  const nearestX = Math.max(left + radius, Math.min(x, left + width - radius));
  const nearestY = Math.max(top + radius, Math.min(y, top + height - radius));
  const dx = x - nearestX;
  const dy = y - nearestY;

  return (
    x >= left &&
    x <= left + width &&
    y >= top &&
    y <= top + height &&
    dx * dx + dy * dy <= radius * radius
  );
}

function dumbbellCoverage(globalX, globalY, offsetX = 0, offsetY = 0) {
  const point = rotatePoint(globalX - offsetX, globalY - offsetY, Math.PI / 12);
  const plates = [
    [86, 184, 52, 144, 18],
    [142, 204, 46, 104, 16],
    [324, 204, 46, 104, 16],
    [374, 184, 52, 144, 18],
  ].some((rect) => inRoundedRect(point.x, point.y, ...rect));
  const handle = inRoundedRect(point.x, point.y, 176, 236, 160, 40, 20);

  return {
    handle,
    plate: plates,
    shadow: plates || handle,
  };
}

function blend(base, overlay) {
  const alpha = overlay[3] / 255;
  const inverse = 1 - alpha;
  return [
    Math.round(overlay[0] * alpha + base[0] * inverse),
    Math.round(overlay[1] * alpha + base[1] * inverse),
    Math.round(overlay[2] * alpha + base[2] * inverse),
    255,
  ];
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const accumulated = [0, 0, 0, 0];

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const sampleX = ((x + (sx + 0.5) / SUPERSAMPLE) / size) * BASE_SIZE;
          const sampleY = ((y + (sy + 0.5) / SUPERSAMPLE) / size) * BASE_SIZE;
          let sample = colors.background;
          const shadow = dumbbellCoverage(sampleX, sampleY, 10, 14);
          const mark = dumbbellCoverage(sampleX, sampleY);

          if (shadow.shadow) {
            sample = blend(sample, colors.shadow);
          }

          if (mark.plate) {
            sample = colors.plate;
          }

          if (mark.handle) {
            sample = colors.handle;
          }

          for (let channel = 0; channel < 4; channel += 1) {
            accumulated[channel] += sample[channel];
          }
        }
      }

      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        pixels[offset + channel] = Math.round(
          accumulated[channel] / (SUPERSAMPLE * SUPERSAMPLE),
        );
      }
    }
  }

  return encodePng(size, size, pixels);
}

function encodeIco(entries) {
  const headerSize = 6;
  const directorySize = 16 * entries.length;
  let imageOffset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize + directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  entries.forEach(({ png, size }, index) => {
    const entryOffset = headerSize + index * 16;
    header[entryOffset] = size >= 256 ? 0 : size;
    header[entryOffset + 1] = size >= 256 ? 0 : size;
    header[entryOffset + 2] = 0;
    header[entryOffset + 3] = 0;
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += png.length;
  });

  return Buffer.concat([header, ...entries.map(({ png }) => png)]);
}

writeFileSync(join(OUTPUT_DIR, "icon.svg"), iconSvg);

const pngs = new Map(
  pngTargets.map(([fileName, size]) => {
    const png = renderIcon(size);
    writeFileSync(join(OUTPUT_DIR, fileName), png);
    return [size, png];
  }),
);

writeFileSync(
  join(OUTPUT_DIR, "favicon.ico"),
  encodeIco([
    { size: 16, png: pngs.get(16) },
    { size: 32, png: pngs.get(32) },
  ]),
);

console.log("Generated app icons in public/.");
