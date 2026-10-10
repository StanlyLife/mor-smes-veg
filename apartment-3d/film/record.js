// Records the planner's renovation film with headless Chrome (own temporary profile), then you encode it with ffmpeg.
// Needs the local server running (node apartment-3d/serve.js). Usage: node apartment-3d/film/record.js <profile-dir>
const { spawn, execSync } = require('child_process'), fs = require('fs'), path = require('path');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = process.argv[2] || path.join(__dirname, '.chrome-profile'), frames = path.join(__dirname, 'frames');
fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
const p = spawn(chrome, ['--headless=new', `--user-data-dir=${profile}`, '--window-size=1280,800', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check',
  'http://localhost:8765/apartment-3d/?record=1'], { stdio: 'ignore' });
const t0 = Date.now();
const iv = setInterval(() => {
  const done = fs.existsSync(path.join(frames, 'done.txt')), n = fs.readdirSync(frames).filter(f => f.endsWith('.jpg')).length;
  console.log(`${n} frames, ${Math.round((Date.now() - t0) / 1000)} s`);
  if (done || Date.now() - t0 > 25 * 60e3) { clearInterval(iv); try { execSync(`taskkill /PID ${p.pid} /T /F`, { stdio: 'ignore' }); } catch { } console.log(done ? 'finished' : 'timed out'); }
}, 5000);
