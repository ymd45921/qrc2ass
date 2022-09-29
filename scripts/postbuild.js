const fs = require('fs');
const path = require('path');

const fileToCopy = [
    'plugins/qrc/qrc.js',
    'plugins/qrc/qrc.wasm',
]

if (!fs.existsSync('build')) fs.mkdirSync('build');
fileToCopy.forEach(dir => 
    fs.copyFileSync(path.join('src', dir), path.join('build', dir)));