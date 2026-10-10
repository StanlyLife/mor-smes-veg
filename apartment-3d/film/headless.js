// Opens a page of the local server in headless Chrome (own temporary profile) and waits until a file appears in film/frames.
// Usage: node apartment-3d/film/headless.js <path on the local server> <file to wait for> [profile dir]
const { spawn, execSync } = require('child_process'), fs = require('fs'), path = require('path');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const [page, waitFor, profile = path.join(__dirname, '.chrome-profile')] = process.argv.slice(2), target = path.join(__dirname, 'frames', waitFor), t0 = Date.now();
try { fs.rmSync(target); } catch { }
const p = spawn(chrome, ['--headless=new', `--user-data-dir=${profile}`, '--window-size=1280,800', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', 'http://localhost:8765/' + page], { stdio: 'ignore' });
const iv = setInterval(() => {
  const done = fs.existsSync(target);
  if (done || Date.now() - t0 > 15 * 60e3) { clearInterval(iv); try { execSync(`taskkill /PID ${p.pid} /T /F`, { stdio: 'ignore' }); } catch { } console.log(done ? `done in ${Math.round((Date.now() - t0) / 1000)} s` : 'timed out'); }
}, 1000);
