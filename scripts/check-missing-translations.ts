#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PlaceholderValue = {
  key: string;
  value: string;
  reason?: string;
};

const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const SUPPORTED_LOCALES = ['en', 'fa'];

console.log('🔍 Checking for missing translations between locales...\n');

// Load translation files
function loadTranslations(locale: string): Record<string, any> {
  const filePath = join(LOCALES_DIR, locale, 'common.json');
  if (!existsSync(filePath)) {
    console.error(`❌ Translation file not found: ${filePath}`);
    return {};
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

// Get all keys from nested object with their values
function getAllKeysWithValues(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, getAllKeysWithValues(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

// Check if a value looks translated (for Persian)
function looksTranslated(value: string, locale: string): boolean {
  if (typeof value !== 'string')
    return true;

  if (locale === 'fa') {
    // Check if contains Persian characters
    const persianRegex = /[\u0600-\u06FF\u200C\u200D]/;
    return persianRegex.test(value);
  }

  return true; // Assume other locales are properly translated
}

// Find empty or placeholder values
function findPlaceholderValues(translations: Record<string, string>, locale: string): PlaceholderValue[] {
  const placeholders: PlaceholderValue[] = [];

  for (const [key, value] of Object.entries(translations)) {
    if (typeof value !== 'string')
      continue;

    // Check for obvious placeholders
    if (value === ''
      || value === 'TODO'
      || value === 'TBD'
      || value === key
      || value.includes('[TODO]')
      || value.includes('[PLACEHOLDER]')) {
      placeholders.push({ key, value });
    }

    // Check for untranslated content (for non-English locales)
    if (locale !== 'en' && !looksTranslated(value, locale)) {
      placeholders.push({ key, value, reason: 'appears untranslated' });
    }
  }

  return placeholders;
}

async function checkMissingTranslations(): Promise<void> {
  console.log('📊 Loading translation files...');

  const translations: Record<string, Record<string, any>> = {};
  const allKeysWithValues: Record<string, Record<string, string>> = {};
  let hasErrors = false;

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`   Loading ${locale}...`);
    translations[locale] = loadTranslations(locale);
    allKeysWithValues[locale] = getAllKeysWithValues(translations[locale]);
    console.log(`      ${Object.keys(allKeysWithValues[locale]).length} keys loaded`);
  }

  // Find missing keys between locales
  console.log('\n🔍 Comparing keys between locales...');

  const missingKeys: Record<string, string[]> = {};

  for (let i = 0; i < SUPPORTED_LOCALES.length; i++) {
    for (let j = i + 1; j < SUPPORTED_LOCALES.length; j++) {
      const locale1 = SUPPORTED_LOCALES[i];
      const locale2 = SUPPORTED_LOCALES[j];

      const keys1 = new Set(Object.keys(allKeysWithValues[locale1]));
      const keys2 = new Set(Object.keys(allKeysWithValues[locale2]));

      const missing1 = [...keys2].filter(key => !keys1.has(key));
      const missing2 = [...keys1].filter(key => !keys2.has(key));

      if (missing1.length > 0) {
        missingKeys[`${locale1} (missing from ${locale2})`] = missing1;
      }

      if (missing2.length > 0) {
        missingKeys[`${locale2} (missing from ${locale1})`] = missing2;
      }
    }
  }

  // Report missing keys
  if (Object.keys(missingKeys).length > 0) {
    console.log('\n❌ Missing keys found:');

    Object.entries(missingKeys).forEach(([comparison, keys]) => {
      console.log(`\n   📝 ${comparison}:`);
      keys.slice(0, 10).forEach((key) => {
        console.log(`      - ${key}`);
      });
      if (keys.length > 10) {
        console.log(`      ... and ${keys.length - 10} more`);
      }
    });
    hasErrors = true;
  } else {
    console.log('✅ All locales have the same keys');
  }

  // Check for placeholder values
  console.log('\n🔍 Checking for placeholder values...');

  for (const locale of SUPPORTED_LOCALES) {
    const placeholders = findPlaceholderValues(allKeysWithValues[locale], locale);

    if (placeholders.length > 0) {
      console.log(`\n❌ Placeholder values found in ${locale}:`);
      placeholders.slice(0, 10).forEach(({ key, value, reason }) => {
        const reasonText = reason ? ` (${reason})` : '';
        console.log(`      ${key}: "${value}"${reasonText}`);
      });
      if (placeholders.length > 10) {
        console.log(`      ... and ${placeholders.length - 10} more`);
      }
      hasErrors = true;
    } else {
      console.log(`✅ No placeholder values found in ${locale}`);
    }
  }

  // Check for duplicated values (potential copy-paste errors)
  console.log('\n🔍 Checking for potential duplicate values...');

  for (const locale of SUPPORTED_LOCALES) {
    const valueMap: Record<string, string> = {};
    const duplicates: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(allKeysWithValues[locale])) {
      if (typeof value !== 'string' || value.length < 10)
        continue;

      if (valueMap[value]) {
        if (!duplicates[value]) {
          duplicates[value] = [valueMap[value]];
        }
        duplicates[value].push(key);
      } else {
        valueMap[value] = key;
      }
    }

    const duplicateEntries = Object.entries(duplicates);
    if (duplicateEntries.length > 0) {
      console.log(`\n⚠️  Potential duplicate values in ${locale}:`);
      duplicateEntries.slice(0, 5).forEach(([value, keys]) => {
        const truncatedValue = value.slice(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`      "${truncatedValue}"`);
        console.log(`      Used in: ${keys.join(', ')}`);
      });
      if (duplicateEntries.length > 5) {
        console.log(`      ... and ${duplicateEntries.length - 5} more duplicates`);
      }
    } else {
      console.log(`✅ No obvious duplicate values in ${locale}`);
    }
  }

  // Summary
  console.log('\n📈 Translation Quality Summary:');
  SUPPORTED_LOCALES.forEach((locale) => {
    const keyCount = Object.keys(allKeysWithValues[locale]).length;
    const placeholders = findPlaceholderValues(allKeysWithValues[locale], locale);
    const completeness = Math.round(((keyCount - placeholders.length) / keyCount) * 100);
    console.log(`   ${locale.toUpperCase()}: ${keyCount} keys, ${completeness}% complete`);
  });

  if (hasErrors) {
    console.log('\n❌ Translation issues found. Please address them above.');
    process.exit(1);
  } else {
    console.log('\n✅ All translation quality checks passed!');
  }
}

checkMissingTranslations().catch((error) => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});
