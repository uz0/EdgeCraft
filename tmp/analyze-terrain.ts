import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import { W3XMapLoader } from '../src/formats/maps/w3x/W3XMapLoader';

async function main(): Promise<void> {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const mapPath = path.resolve(__dirname, '../public/maps/[12]MeltedCrown_1.0.w3x');
  const nodeBuffer = await fs.readFile(mapPath);
  const buffer = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  ) as ArrayBuffer;

  const loader = new W3XMapLoader();
  const raw = await loader.parse(buffer);

  const { terrain } = raw;
  console.log('width', terrain.width, 'height', terrain.height);

  const heights = terrain.heightmap;
  const sample = Array.from(heights.slice(0, 16));
  console.log('first 16 heights', sample);

  if (terrain.water) {
    console.log('avg water level', terrain.water.level);
  }

  const tileCount = terrain.width * terrain.height;
  const uniqueHeights = new Set<number>();
  for (let i = 0; i < tileCount; i++) {
    uniqueHeights.add(Math.round(heights[i] ?? 0));
    if (uniqueHeights.size > 20) {
      break;
    }
  }
  console.log('sample unique heights', Array.from(uniqueHeights));
}

void main();
