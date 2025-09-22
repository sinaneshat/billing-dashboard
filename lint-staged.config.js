module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix --no-warn-ignored'],
  '*.{ts,tsx}': () => 'pnpm run clean && pnpm run check-types',
};
