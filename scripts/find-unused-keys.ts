#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const SOURCE_DIRS = [
  join(__dirname, '..', 'src', 'components'),
  join(__dirname, '..', 'src', 'app'),
  join(__dirname, '..', 'src', 'containers'),
];

console.log('🧹 Finding unused translation keys...\n');

// Load translation files
function loadTranslations(locale: string): Record<string, any> {
  const filePath = join(LOCALES_DIR, locale, 'common.json');
  if (!existsSync(filePath)) {
    console.error(`❌ Translation file not found: ${filePath}`);
    return {};
  }
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// Get all keys from nested object
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Find all files recursively
function findFiles(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
  const files: string[] = [];
  if (!existsSync(dir))
    return files;

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !excludeDirs.includes(item)) {
      files.push(...findFiles(fullPath, extensions, excludeDirs));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

// Check if key is used in source files
function isKeyUsed(key: string, sourceContent: string): boolean {
  // Check for direct usage: t('key')
  if (sourceContent.includes(`'${key}'`) || sourceContent.includes(`"${key}"`)) {
    return true;
  }

  // Check for template usage: t(`key`)
  if (sourceContent.includes(`\`${key}\``)) {
    return true;
  }

  // Check for dynamic usage patterns
  const keyParts = key.split('.');
  if (keyParts.length > 1) {
    // Check for partial key usage (dynamic access)
    for (let i = 1; i < keyParts.length; i++) {
      const partialKey = keyParts.slice(0, i).join('.');
      const dynamicAccess = keyParts.slice(i).join('.');

      if (sourceContent.includes(`'${partialKey}'`) || sourceContent.includes(`"${partialKey}"`)) {
        // Look for potential dynamic access patterns
        if (sourceContent.includes(dynamicAccess) || sourceContent.includes(`${keyParts[i]}`)) {
          return true;
        }
      }
    }
  }

  return false;
}

async function findUnusedKeys(): Promise<void> {
  console.log('📊 Loading translations...');
  const translations = loadTranslations('en'); // Use English as reference
  const allKeys = getAllKeys(translations);
  console.log(`   Found ${allKeys.length} translation keys`);

  console.log('\n📁 Loading source files...');
  const allSourceFiles: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const files = findFiles(dir, ['.tsx', '.ts'], ['node_modules', '.next']);
    allSourceFiles.push(...files);
  }
  console.log(`   Found ${allSourceFiles.length} source files`);

  console.log('\n🔍 Reading source content...');
  let combinedSourceContent = '';
  for (const file of allSourceFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      combinedSourceContent += ` ${content}`;
    } catch (error) {
      console.warn(`   ⚠️  Could not read ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n🧹 Checking key usage...');
  const unusedKeys: string[] = [];
  const usedKeys: string[] = [];

  for (const key of allKeys) {
    if (isKeyUsed(key, combinedSourceContent)) {
      usedKeys.push(key);
    } else {
      unusedKeys.push(key);
    }
  }

  // Results
  console.log('\n📈 Usage Analysis:');
  console.log(`   Total keys: ${allKeys.length}`);
  console.log(`   Used keys: ${usedKeys.length}`);
  console.log(`   Unused keys: ${unusedKeys.length}`);
  console.log(`   Usage rate: ${Math.round((usedKeys.length / allKeys.length) * 100)}%`);

  if (unusedKeys.length > 0) {
    console.log('\n❌ Potentially unused keys:');

    // Group by section for better organization
    const keysBySection: Record<string, string[]> = {};
    unusedKeys.forEach((key) => {
      const section = key.split('.')[0];
      if (!keysBySection[section]) {
        keysBySection[section] = [];
      }
      keysBySection[section].push(key);
    });

    Object.entries(keysBySection).forEach(([section, keys]) => {
      console.log(`\n   📂 ${section}:`);
      keys.slice(0, 10).forEach((key) => {
        console.log(`      - ${key}`);
      });
      if (keys.length > 10) {
        console.log(`      ... and ${keys.length - 10} more`);
      }
    });

    console.log('\n⚠️  Note: Some keys might be used dynamically and not detected by this script.');
    console.log('   Please review these keys manually before removing them.');
  } else {
    console.log('\n✅ All translation keys appear to be in use!');
  }
}

findUnusedKeys().catch((error) => {
  console.error('💥 Analysis failed:', error);
  process.exit(1);
});
