const fs = require('fs');

fs.writeFileSync('src/index.ts', `export * from './demo';`);