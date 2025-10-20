#!/usr/bin/env node

/**
 * Clean up unused variables and empty blocks from console removal
 */

import fs from 'fs';
import { execSync } from 'child_process';

let fixed = 0;

// Get all files with issues
const files = [
  'src/config/external.ts',
  'src/engine/rendering/AdvancedLightingSystem.ts',
  'src/engine/rendering/MapPreviewExtractor.ts',
  'src/engine/rendering/MapRendererCore.ts',
  'src/engine/rendering/PBRMaterialSystem.ts',
  'src/engine/rendering/PostProcessingPipeline.ts',
  'src/engine/rendering/RenderPipeline.ts',
  'src/engine/terrain/TerrainRenderer.ts',
  'src/formats/compression/ZlibDecompressor.ts',
  'src/formats/maps/w3n/W3NCampaignLoader.ts',
  'src/formats/maps/w3x/W3EParser.ts',
  'src/formats/maps/w3x/W3IParser.ts',
  'src/formats/maps/w3x/W3UParser.ts',
  'src/formats/mpq/MPQParser.ts',
  'src/hooks/useMapPreviews.ts',
  'src/ui/GameCanvas.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip lines with unused variables starting with _
    if (/^\s*(const|let)\s+_[a-zA-Z0-9_]+\s*[=:]/.test(line)) {
      console.log(`Removing unused var in ${file}:${i + 1}`);
      // Check if it's part of destructuring
      if (line.includes('const {') || line.includes('= err')) {
        // Keep error destructuring, just comment it out
        newLines.push(`      // ${line.trim()} // Unused after console removal`);
      }
      fixed++;
      i++;
      continue;
    }

    // Remove empty catch blocks: } catch (err) {}
    if (/}\s*catch\s*\([^)]*\)\s*\{\s*\}\s*$/.test(line)) {
      console.log(`Removing empty catch in ${file}:${i + 1}`);
      newLines.push(line.replace(/catch\s*\([^)]*\)\s*\{\s*\}/, '').trim());
      fixed++;
      i++;
      continue;
    }

    // Remove standalone empty blocks
    if (/^\s*\{\s*\}\s*$/.test(line)) {
      console.log(`Removing empty block in ${file}:${i + 1}`);
      fixed++;
      i++;
      continue;
    }

    // Remove lines with just: } catch (err) {
    // followed by empty line and closing brace
    if (/}\s*catch\s*\([^)]*\)\s*\{\s*$/.test(line)) {
      const nextLine = lines[i + 1];
      const afterNext = lines[i + 2];
      if (nextLine && /^\s*$/.test(nextLine) && afterNext && /^\s*\}\s*$/.test(afterNext)) {
        console.log(`Removing useless catch wrapper in ${file}:${i + 1}`);
        // Just keep the closing brace
        newLines.push(afterNext);
        fixed += 3;
        i += 3;
        continue;
      }
    }

    newLines.push(line);
    i++;
  }

  if (newLines.length !== lines.length || newLines.join('\n') !== content) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log(`✅ Fixed ${file}`);
  }
}

console.log(`\n✅ Total fixes: ${fixed}`);
