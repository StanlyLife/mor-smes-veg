// Builds planner.html (the page fragment published as an Artifact) and index.html (open locally) from src/.
// Usage: node build.js
const fs = require('fs'), path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const js = ['01-core.js', '02-items.js', '02b-decor.js', '03-state.js', '03b-renovated.js', '04-scene.js', '05-interact.js', '07-film.js', '06-ui.js'].map(src).join('\n');
const importmap = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>';
const fragment = `${src('head.html')}\n${importmap}\n<script type="module">\n${js}\n</script>\n`;
fs.writeFileSync(path.join(__dirname, 'planner.html'), fragment);
const page = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${fragment}</body></html>\n`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
console.log('built', (fragment.length / 1024).toFixed(0) + ' KB');
