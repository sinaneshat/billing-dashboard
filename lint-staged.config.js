module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix --no-warn-ignored'],
  '*.{ts,tsx}': () => 'pnpm run check-types',
};
