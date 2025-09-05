/**
 * Knip Configuration - TypeScript for type safety
 * Following official best practices from knip documentation
 */

const config = {
  // JSON Schema for IDE support
  $schema: 'https://unpkg.com/knip@5/schema.json',

  // Entry files - be specific and minimize wildcards per knip best practices
  entry: [
    'src/api/index.ts',
    'src/app/**/page.tsx',
    'src/app/**/layout.tsx',
    'src/app/**/loading.tsx',
    'src/app/**/error.tsx',
    'src/app/**/not-found.tsx',
    'src/middleware.ts',
    'next.config.mjs',
    'tailwind.config.ts',
    'drizzle.config.ts',
  ],

  // Project files - include all source and configuration files
  project: [
    'src/**/*.{ts,tsx}',
    'scripts/**/*.{ts,js}',
    '*.{ts,tsx,js,mjs}',
    'drizzle/**/*.sql',
  ],

  // Ignore generated and external files
  ignore: [
    'src/db/migrations/**',
    '**/*.generated.{ts,tsx}',
    'dist/**',
    'build/**',
    '.next/**',
    'node_modules/**',
  ],

  // Ignore dependencies that are used indirectly
  ignoreDependencies: [
    // Type-only packages
    '@types/*',
    // Runtime dependencies loaded dynamically
    'better-auth',
    'drizzle-orm',
    '@libsql/client',
  ],

  // Ignore binaries that are used in CI/deployment
  ignoreBinaries: [
    'docker',
    'docker-compose',
    'vercel',
    'next',
  ],

  // Plugin configurations for supported tools
  eslint: {
    config: ['.eslintrc.json', 'eslint.config.js'],
  },

  prettier: {
    config: ['.prettierrc', 'prettier.config.js'],
  },

  typescript: {
    config: ['tsconfig.json', 'tsconfig.*.json'],
  },

  next: {
    config: ['next.config.mjs'],
  },
};

export default config;
