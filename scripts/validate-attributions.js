#!/usr/bin/env node
/**
 * Validate license attributions
 * Ensures all assets have proper attribution
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { AssetDatabase } from '../src/assets/validation/AssetDatabase.js';
import { LicenseGenerator } from '../src/assets/validation/LicenseGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateAttributions() {
  console.log('🔍 Validating license attributions...\n');

  try {
    // Initialize
    const database = new AssetDatabase();
    const generator = new LicenseGenerator(database);

    // Validate
    const result = generator.validateAttributions();

    if (result.valid) {
      console.log('✅ All license attributions are valid!\n');
      process.exit(0);
    } else {
      console.error('❌ License attribution validation failed!\n');
      console.error('Errors:');
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
      console.error('');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error validating attributions:', error.message);
    process.exit(1);
  }
}

validateAttributions();
