#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type ComponentAnalysis = {
  path: string;
  hasTranslationImport: boolean;
  hasUseTranslations: boolean;
  translationKeys: string[];
  hardcodedStrings: string[];
  isComponent: boolean;
};

type CoverageSummary = {
  componentCoverage: number;
  keyCoverage: number;
  totalComponents: number;
  componentsWithTranslations: number;
  totalHardcodedStrings: number;
  unusedKeys: number;
  success: boolean;
};

const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');
const APP_DIR = join(__dirname, '..', 'src', 'app');
const SUPPORTED_LOCALES = ['en', 'fa'];

console.log('📊 Translation Coverage Report\n');

// Load translation files
function loadTranslations(locale: string): Record<string, any> {
  const filePath = join(LOCALES_DIR, locale, 'common.json');
  if (!existsSync(filePath)) {
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

// Analyze component translation usage
function analyzeComponent(filePath: string): ComponentAnalysis {
  const content = readFileSync(filePath, 'utf8');
  const relativePath = relative(process.cwd(), filePath);

  const analysis: ComponentAnalysis = {
    path: relativePath,
    hasTranslationImport: false,
    hasUseTranslations: false,
    translationKeys: [],
    hardcodedStrings: [],
    isComponent: false,
  };

  // Check if it's a React component
  analysis.isComponent = content.includes('export')
    && (content.includes('function') || content.includes('const'))
    && (content.includes('jsx') || content.includes('tsx') || content.includes('return'));

  if (!analysis.isComponent) {
    return analysis;
  }

  // Check for translation imports
  analysis.hasTranslationImport = content.includes('next-intl')
    || content.includes('useTranslations')
    || content.includes('useLocale');

  // Check for useTranslations hook
  analysis.hasUseTranslations = content.includes('useTranslations()')
    || /useTranslations\(['"`][^'"`]*['"`]\)/.test(content);

  // Find translation keys
  const tCallRegex = /t\(['"`]([^'"`]+)['"`]\)/g;
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    analysis.translationKeys.push(match[1]);
  }

  // Find potential hardcoded strings
  const stringRegex = /["'`]([A-Z][^"'\x60-\x7A]*[A-Z][^"'`]*)["'`]/gi;
  while ((match = stringRegex.exec(content)) !== null) {
    const text = match[1];

    // Skip technical strings and short strings
    if (text.length < 5
      || /^[a-z-_]+$/i.test(text)
      || /^https?:\/\//i.test(text)
      || /^\d+/.test(text)
      || text.includes('t(')) {
      continue;
    }

    // Look like user-facing text
    if (/[A-Z]/.test(text) && (text.includes(' ') || text.length > 10)) {
      const context = content.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30);
      if (!context.includes('t(') && !context.includes('useTranslations')) {
        analysis.hardcodedStrings.push(text);
      }
    }
  }

  return analysis;
}

// Generate coverage report
async function generateCoverageReport(): Promise<CoverageSummary> {
  console.log('📊 Loading translation data...');

  // Load all translations
  const translations: Record<string, Record<string, any>> = {};
  const totalKeys: Record<string, string[]> = {};

  for (const locale of SUPPORTED_LOCALES) {
    translations[locale] = loadTranslations(locale);
    totalKeys[locale] = getAllKeys(translations[locale]);
    console.log(`   ${locale}: ${totalKeys[locale].length} keys`);
  }

  const primaryLocale = 'en';
  const referenceKeys = new Set(totalKeys[primaryLocale]);

  console.log('\n📁 Analyzing components...');

  // Find and analyze all component files
  const componentFiles = [
    ...findFiles(COMPONENTS_DIR, ['.tsx', '.ts'], ['node_modules', '.next']),
    ...findFiles(APP_DIR, ['.tsx', '.ts'], ['node_modules', '.next']),
  ];

  console.log(`   Found ${componentFiles.length} files`);

  const componentAnalysis: ComponentAnalysis[] = [];
  let totalComponents = 0;
  let componentsWithTranslations = 0;
  const totalUsedKeys = new Set<string>();
  let totalHardcodedStrings = 0;

  for (const file of componentFiles) {
    const analysis = analyzeComponent(file);

    if (analysis.isComponent) {
      totalComponents++;
      componentAnalysis.push(analysis);

      if (analysis.hasTranslationImport && analysis.translationKeys.length > 0) {
        componentsWithTranslations++;
      }

      analysis.translationKeys.forEach(key => totalUsedKeys.add(key));
      totalHardcodedStrings += analysis.hardcodedStrings.length;
    }
  }

  // Calculate statistics
  const componentCoverage = totalComponents > 0 ? (componentsWithTranslations / totalComponents) * 100 : 0;
  const keyCoverage = referenceKeys.size > 0 ? (totalUsedKeys.size / referenceKeys.size) * 100 : 0;
  const unusedKeys = [...referenceKeys].filter(key => !totalUsedKeys.has(key));

  // Generate report
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 TRANSLATION COVERAGE REPORT');
  console.log('='.repeat(60));

  console.log('\n📊 Overall Statistics:');
  console.log(`   Total Components: ${totalComponents}`);
  console.log(`   Components with Translations: ${componentsWithTranslations}`);
  console.log(`   Component Coverage: ${componentCoverage.toFixed(1)}%`);
  console.log(`   Translation Keys Available: ${referenceKeys.size}`);
  console.log(`   Translation Keys Used: ${totalUsedKeys.size}`);
  console.log(`   Key Usage Coverage: ${keyCoverage.toFixed(1)}%`);
  console.log(`   Unused Keys: ${unusedKeys.length}`);
  console.log(`   Potential Hardcoded Strings: ${totalHardcodedStrings}`);

  // Locale comparison
  console.log('\n🌍 Locale Comparison:');
  SUPPORTED_LOCALES.forEach((locale) => {
    const keys = totalKeys[locale];
    const missing = SUPPORTED_LOCALES[0] === locale
      ? 0
      : totalKeys[SUPPORTED_LOCALES[0]].filter(key => !keys.includes(key)).length;
    console.log(`   ${locale.toUpperCase()}: ${keys.length} keys${missing > 0 ? `, ${missing} missing` : ''}`);
  });

  // Top translation sections
  console.log('\n📂 Top Translation Sections:');
  const sectionUsage: Record<string, number> = {};
  totalUsedKeys.forEach((key) => {
    const section = key.split('.')[0];
    sectionUsage[section] = (sectionUsage[section] || 0) + 1;
  });

  Object.entries(sectionUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([section, count]) => {
      console.log(`   ${section}: ${count} keys used`);
    });

  // Problem areas
  if (totalHardcodedStrings > 0) {
    console.log('\n❌ Components with Potential Issues:');
    componentAnalysis
      .filter(c => c.hardcodedStrings.length > 0)
      .sort((a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length)
      .slice(0, 10)
      .forEach((component) => {
        console.log(`   ${component.path}: ${component.hardcodedStrings.length} hardcoded strings`);
        component.hardcodedStrings.slice(0, 2).forEach((str) => {
          console.log(`      - "${str}"`);
        });
      });
  }

  // Unused keys preview
  if (unusedKeys.length > 0) {
    console.log('\n🧹 Some Unused Keys:');
    unusedKeys.slice(0, 10).forEach((key) => {
      console.log(`   - ${key}`);
    });
    if (unusedKeys.length > 10) {
      console.log(`   ... and ${unusedKeys.length - 10} more`);
    }
  }

  // Recommendations
  console.log('\n💡 Recommendations:');

  if (componentCoverage < 90) {
    console.log(`   🔧 Improve component translation coverage (currently ${componentCoverage.toFixed(1)}%)`);
  }

  if (totalHardcodedStrings > 0) {
    console.log(`   🔧 Address ${totalHardcodedStrings} potential hardcoded strings`);
  }

  if (unusedKeys.length > 20) {
    console.log(`   🔧 Consider removing ${unusedKeys.length} unused translation keys`);
  }

  if (componentCoverage >= 95 && totalHardcodedStrings === 0 && keyCoverage >= 80) {
    console.log('   Excellent translation coverage! Your app is well-internationalized.');
  }

  console.log(`\n${'='.repeat(60)}`);

  // Return summary for CI/CD
  return {
    componentCoverage,
    keyCoverage,
    totalComponents,
    componentsWithTranslations,
    totalHardcodedStrings,
    unusedKeys: unusedKeys.length,
    success: componentCoverage >= 90 && totalHardcodedStrings <= 5,
  };
}

generateCoverageReport().then((summary) => {
  if (summary.success) {
    console.log('\nTranslation coverage meets quality standards!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Translation coverage could be improved.');
    process.exit(0); // Don't fail the build, just report
  }
}).catch((error) => {
  console.error('💥 Coverage report failed:', error);
  process.exit(1);
});
