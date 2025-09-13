#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type HardcodedString = {
  text: string;
  line: number;
  context: string;
};

type ProblematicFile = {
  file: string;
  issues: HardcodedString[];
};

const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');
const APP_DIR = join(__dirname, '..', 'src', 'app');
const SUPPORTED_LOCALES = ['en', 'fa'];

let hasErrors = false;

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

// Find hardcoded strings in files
function findHardcodedStrings(filePath: string): HardcodedString[] {
  const content = readFileSync(filePath, 'utf8');
  const hardcoded: HardcodedString[] = [];

  // Skip utility files and type definitions
  if (content.includes('export const') && content.includes('as const')) {
    return hardcoded;
  }

  // Common hardcoded string patterns
  const patterns = [
    // Direct strings in JSX
    /"([A-Z][^"A-Z]*[A-Z][^"]*)"/gi,
    // Template literals with readable content
    /`([A-Z][^\x60-\x7A]*[A-Z][^`]*)`/gi,
  ];

  const excludePatterns = [
    // Technical strings
    /^(http|https|ftp|mailto):/,
    /^[a-z]+[-_][a-z]+/i, // CSS classes, IDs
    /^\d+/, // Numbers
    /^[A-Z_]+$/, // Constants
    /^[a-z]+$/, // Single words (might be props)
    // File paths and imports
    /^\.\/|^\/|^\.\.\//,
    // Common technical terms
    /^(px|em|rem|vh|vw|%|deg|ms|s)$/,
    /^(auto|none|hidden|visible|block|inline|flex|grid)$/,
    // API related
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
    // Colors and CSS values
    /^(transparent|inherit|initial|unset)$/,
    /^#[0-9a-f]{3,8}$/i,
    // Mime types
    /^[a-z]+\/[a-z-+]+$/,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1];

      // Skip if it matches exclude patterns
      if (excludePatterns.some(exclude => exclude.test(text))) {
        continue;
      }

      // Skip very short strings (likely props or technical)
      if (text.length < 3) {
        continue;
      }

      // Skip if it contains translation function calls
      const context = content.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50);
      if (context.includes('t(') || context.includes('useTranslations')) {
        continue;
      }

      // Check if this looks like user-facing text
      if (/[A-Z]/.test(text) && text.split(' ').length >= 2) {
        hardcoded.push({
          text,
          line: content.slice(0, match.index).split('\n').length,
          context: context.trim(),
        });
      }
    }
  }

  return hardcoded;
}

// Main validation
async function validateTranslations(): Promise<void> {
  console.log('🌍 Validating Translation Coverage...\n');

  console.log('📊 Loading translation files...');

  const translations: Record<string, Record<string, any>> = {};
  const allKeys: Record<string, string[]> = {};

  for (const locale of SUPPORTED_LOCALES) {
    translations[locale] = loadTranslations(locale);
    allKeys[locale] = getAllKeys(translations[locale]);
    console.log(`   ${locale}: ${allKeys[locale].length} keys`);
  }

  // Check for missing keys between locales
  console.log('\n🔍 Checking for missing keys between locales...');
  const enKeys = new Set(allKeys.en);
  const faKeys = new Set(allKeys.fa);

  const missingInFa = [...enKeys].filter(key => !faKeys.has(key));
  const missingInEn = [...faKeys].filter(key => !enKeys.has(key));

  if (missingInFa.length > 0) {
    console.error(`❌ Missing in Persian (${missingInFa.length}):`);
    missingInFa.slice(0, 10).forEach(key => console.error(`   - ${key}`));
    if (missingInFa.length > 10) {
      console.error(`   ... and ${missingInFa.length - 10} more`);
    }
    hasErrors = true;
  }

  if (missingInEn.length > 0) {
    console.error(`❌ Missing in English (${missingInEn.length}):`);
    missingInEn.slice(0, 10).forEach(key => console.error(`   - ${key}`));
    if (missingInEn.length > 10) {
      console.error(`   ... and ${missingInEn.length - 10} more`);
    }
    hasErrors = true;
  }

  if (missingInFa.length === 0 && missingInEn.length === 0) {
    console.log('All translation keys are present in both locales');
  }

  // Find hardcoded strings in components
  console.log('\n🔍 Scanning for hardcoded strings...');
  const componentFiles = [
    ...findFiles(COMPONENTS_DIR, ['.tsx', '.ts'], ['node_modules', '.next']),
    ...findFiles(APP_DIR, ['.tsx', '.ts'], ['node_modules', '.next']),
  ];

  console.log(`   Scanning ${componentFiles.length} files...`);

  let totalHardcoded = 0;
  const problematicFiles: ProblematicFile[] = [];

  for (const file of componentFiles) {
    const hardcoded = findHardcodedStrings(file);
    if (hardcoded.length > 0) {
      totalHardcoded += hardcoded.length;
      problematicFiles.push({
        file: relative(process.cwd(), file),
        issues: hardcoded,
      });
    }
  }

  if (totalHardcoded > 0) {
    console.error(`❌ Found ${totalHardcoded} potential hardcoded strings in ${problematicFiles.length} files:`);

    // Show top issues
    problematicFiles.slice(0, 5).forEach(({ file, issues }) => {
      console.error(`\n   📁 ${file}:`);
      issues.slice(0, 3).forEach(({ text, line }) => {
        console.error(`      Line ${line}: "${text}"`);
      });
      if (issues.length > 3) {
        console.error(`      ... and ${issues.length - 3} more`);
      }
    });

    if (problematicFiles.length > 5) {
      console.error(`\n   ... and ${problematicFiles.length - 5} more files`);
    }

    hasErrors = true;
  } else {
    console.log('No obvious hardcoded strings found');
  }

  // Summary
  console.log('\n📈 Translation Coverage Summary:');
  console.log(`   Total translation keys: ${allKeys.en.length}`);
  console.log(`   Files scanned: ${componentFiles.length}`);
  console.log(`   Potential issues found: ${totalHardcoded + missingInFa.length + missingInEn.length}`);

  if (hasErrors) {
    console.log('\n❌ Translation validation failed. Please address the issues above.');
    process.exit(1);
  } else {
    console.log('\nAll translation checks passed! Your app appears to be 100% translated.');
    process.exit(0);
  }
}

// Run validation
validateTranslations().catch((error) => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});
