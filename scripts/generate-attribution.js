#!/usr/bin/env node
/**
 * Generate license attribution file
 * Creates assets/LICENSES.md with all third-party asset attributions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AssetDatabase } from '../src/assets/validation/AssetDatabase.js';
import { LicenseGenerator } from '../src/assets/validation/LicenseGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAttribution() {
  console.log('🔍 Generating license attribution file...\n');

  try {
    // Initialize

    // Initialize
    const database = new AssetDatabase();
    const generator = new LicenseGenerator(database);

    // Generate license file
    const content = await generator.generateLicensesFile();

    // Ensure assets directory exists
    const assetsDir = path.join(__dirname, '..', 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // Write file
    const outputPath = path.join(assetsDir, 'LICENSES.md');
    await fs.writeFile(outputPath, content, 'utf-8');

    console.log('✅ License attribution file generated successfully!');
    console.log(`📄 Output: ${outputPath}\n`);

    // Show statistics
    const stats = database.getStats();
    console.log('📊 Statistics:');
    console.log(`   Total mappings: ${stats.totalMappings}`);
    console.log(`   Verified: ${stats.verified}`);
    console.log(`   By type:`);
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`     - ${type}: ${count}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error generating attribution file:', error.message);
    process.exit(1);
  }
}

generateAttribution();
