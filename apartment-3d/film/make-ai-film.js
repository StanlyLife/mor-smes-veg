// Builds film/oppussing-ai.mp4 (1920x1080, 30 fps) from the photo-real stage images:
// the listing photo, two AI edits (empty room, herringbone vinyl) and three painted-on stages (boards, beige, trim).
// Usage: node apartment-3d/film/make-ai-film.js
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const FF = process.env.FFMPEG || 'C:\\Users\\stian\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const dir = __dirname, ai = p => path.join(dir, 'ai', p), tmp = path.join(dir, 'frames');
const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf', MONO = 'C\\:/Windows/Fonts/consolab.ttf';
const stills = [path.join(dir, '..', '..', 'listing', 'images', '03.jpg'), ai('s1-empty.png'), ai('s2-vinyl.png'), ai('s3-boards.png'), ai('s4-beige.png'), ai('s5-trim.png')];
const L = [5.0, 5.5, 6.0, 6.0, 5.0, 6.5], X = [['fade', 1.5], ['smoothup', 2.0], ['smoothleft', 2.0], ['smoothdown', 2.0], ['fade', 1.5]];
// offsets: transition i starts when clip i has been on screen for its own length minus the transition
const starts = [0]; for (let i = 0; i < X.length; i++) starts.push((i ? starts[i] : 0) + L[i] - X[i][1]);
const TA = starts[X.length] + L[X.length]; // length of the stage sequence
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\u2019").replace(/:/g, '\\:').replace(/,/g, '\\,');
const fadeA = (a, b) => `if(lt(t\\,${a})\\,0\\,if(lt(t\\,${a + 0.4})\\,(t-${a})/0.4\\,if(lt(t\\,${b - 0.4})\\,1\\,if(lt(t\\,${b})\\,(${b}-t)/0.4\\,0))))`;
const caption = (num, txt, a, b) => {
  const y = 'h-150', box = `box=1:boxcolor=0x101213@0.72:boxborderw=26`;
  return (num ? `drawtext=fontfile='${MONO}':text='${num}':fontsize=34:fontcolor=0xE3B13A:x=70:y=${y}+6:alpha='${fadeA(a, b)}',` : '') +
    `drawtext=fontfile='${FONT}':text='${esc(txt)}':fontsize=46:fontcolor=0xF4F1EA:x=${num ? 140 : 70}:y=${y}:${box}:alpha='${fadeA(a, b)}'`;
};
const caps = [['', 'Before', 0, starts[1]], ['', 'Furniture out', starts[1], starts[2]], ['', 'Click vinyl, dark herringbone', starts[2], starts[3]],
  ['', 'Rehab boards over the old wallpaper', starts[3], starts[4]], ['', 'Filled and painted beige', starts[4], starts[5]], ['', 'New skirting, crown and wall mouldings', starts[5], TA - 2.2], ['', 'After', TA - 2.2, TA + 0.01]];
const brand = `drawtext=fontfile='${FONT}':text='Mor Smes veg 11C · Oppussing':fontsize=28:fontcolor=0xF4F1EA:x=60:y=48:box=1:boxcolor=0x101213@0.5:boxborderw=16`;
// ---- part A: the stages, one slow continuous push-in toward the corner
const inputs = [], f = [];
stills.forEach((s, i) => { inputs.push('-loop', '1', '-t', String(L[i]), '-i', s); f.push(`[${i}:v]scale=2528:1686:flags=lanczos,crop=2528:1422:0:150,setsar=1,fps=30,format=yuv444p[s${i}]`); });
let prev = 's0'; X.forEach(([kind, d], i) => { f.push(`[${prev}][s${i + 1}]xfade=transition=${kind}:duration=${d}:offset=${starts[i + 1].toFixed(3)}[x${i}]`); prev = `x${i}`; });
f.push(`[${prev}]scale=w='trunc(2528*(1+0.10*t/${TA})/2)*2':h=-2:eval=frame:flags=bicubic,crop=2528:1422:'(iw-2528)*0.56':'(ih-1422)*0.5',scale=1920:1080:flags=lanczos,${caps.map(c => caption(...c)).join(',')},${brand},format=yuv420p[A]`);
// ---- part B: before / after slider (empty room then and now)
const TB = 7, n = stills.length;
inputs.push('-loop', '1', '-t', String(TB), '-i', stills[1], '-loop', '1', '-t', String(TB), '-i', stills[5]);
// divider position over time (T): sweeps in from the right, swings across, settles in the middle
const d = `if(lt(T\\,1.6)\\,1920-960*(1-cos(PI*T/1.6))/2\\,if(lt(T\\,5.2)\\,960+430*sin((T-1.6)*1.75)\\,960+430*sin(3.6*1.75)*(1-(T-5.2)/1.8)))`;
const side = v => `'if(lt(abs(X-(${d}))\\,3)\\,${v}\\,if(gt(X\\,${d})\\,B\\,A))'`; // "after" right of the divider, a light line on it
f.push(`[${n}:v]scale=2528:1686:flags=lanczos,crop=2528:1422:0:150,scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv444p[b0]`);
f.push(`[${n + 1}:v]scale=2528:1686:flags=lanczos,crop=2528:1422:0:150,scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv444p[b1]`);
f.push(`[b0][b1]blend=c0_expr=${side(232)}:c1_expr=${side(128)}:c2_expr=${side(128)},format=yuv420p,` +
  `drawtext=fontfile='${FONT}':text='Before':fontsize=40:fontcolor=0xF4F1EA:x=70:y=h-140:box=1:boxcolor=0x101213@0.72:boxborderw=22,` +
  `drawtext=fontfile='${FONT}':text='After':fontsize=40:fontcolor=0xF4F1EA:x=w-tw-70:y=h-140:box=1:boxcolor=0x101213@0.72:boxborderw=22,${brand}[B]`);
f.push(`[A][B]concat=n=2:v=1:a=0,scale=in_range=full:out_range=tv,format=yuv420p[out]`); // standard video range plays right on phones
fs.mkdirSync(tmp, { recursive: true }); const script = path.join(tmp, 'ai-film-filter.txt'); fs.writeFileSync(script, f.join(';\n'));
const out = path.join(dir, 'oppussing-ai.mp4');
execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-/filter_complex', script, '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, 'length', (TA + TB).toFixed(1), 's; stage starts', starts.map(s => s.toFixed(1)).join(', '));
