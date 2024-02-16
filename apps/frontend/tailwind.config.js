const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

module.exports = {
  content: [
    ...createGlobPatternsForDependencies(__dirname + '../../../libraries/react-shared-libraries'),
    join(
        __dirname + '../../../libraries/react-shared-libraries',
        '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    join(
        __dirname,
        '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000',
        secondary: '#090B13',
        third: '#080B13',
        forth: '#612AD5',
        fifth: '#28344F',
        sixth: '#0B101B',
        gray: '#8C8C8C',
        input: '#131B2C',
        inputText: '#64748B',
        tableBorder: '#1F2941'
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr));'
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')
  ],
};