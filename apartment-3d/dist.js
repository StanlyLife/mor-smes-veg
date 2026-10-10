// Collects the public site in dist/ (deployed by Vercel): the planner page and the mood renders, nothing else.
// Usage: node apartment-3d/dist.js (after build.js)
const fs = require('fs'), path = require('path'), out = path.join(__dirname, 'dist');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(out, 'index.html'));
fs.cpSync(path.join(__dirname, 'renders'), path.join(out, 'renders'), { recursive: true });
console.log('dist ready:', fs.readdirSync(out).join(', '));
