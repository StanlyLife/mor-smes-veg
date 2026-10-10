// Builds film/stue-render-film.mp4 (1920x1080, 30 fps): listing photo 03 renovated stage by stage into the living-room mood render
// (renders/stue.webp). Stage images come from compose.html?variant=render. Usage: node apartment-3d/film/make-render-film.js
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const FF = process.env.FFMPEG || 'C:\\Users\\stian\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const dir = __dirname, ai = p => path.join(dir, 'ai', p), tmp = path.join(dir, 'frames');
const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf', PHOTO = path.join(dir, '..', '..', 'listing', 'images', '03.jpg'), RENDER = path.join(dir, '..', 'renders', 'stue.webp');
// stage: [image, seconds on screen, caption, transition into the next stage, its length]
const S = [
  [PHOTO, 4.5, 'Before', 'fade', 1.5],
  [ai('s1-empty.png'), 5.0, 'Furniture out', 'smoothup', 2.0],
  [ai('s2r-oak.png'), 5.5, 'Herringbone oak floor', 'smoothleft', 2.0],
  [ai('s3r-boards.png'), 5.5, 'Rehab boards over the old wallpaper', 'smoothdown', 2.0],
  [ai('s4r-taupe.png'), 5.0, 'Filled and painted taupe', 'fade', 1.5],
  [ai('s5r-trim.png'), 5.0, 'Crown, panels and casings in the wall colour', 'fade', 2.0],
  [ai('s6r-evening.png'), 4.5, 'Evening light', 'fade', 2.5],
  [RENDER, 8.0, 'Furniture, built-in shelves and lamps', null, 0],
];
const starts = [0]; for (let i = 0; i < S.length - 1; i++) starts.push(starts[i] + S[i][1] - S[i][4]);
const TA = starts[S.length - 1] + S[S.length - 1][1];
const esc = s => s.replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/,/g, '\\,');
const fadeA = (a, b) => `if(lt(t\\,${a})\\,0\\,if(lt(t\\,${a + 0.4})\\,(t-${a})/0.4\\,if(lt(t\\,${b - 0.4})\\,1\\,if(lt(t\\,${b})\\,(${b}-t)/0.4\\,0))))`;
const cap = (txt, a, b) => `drawtext=fontfile='${FONT}':text='${esc(txt)}':fontsize=46:fontcolor=0xF4F1EA:x=70:y=h-150:box=1:boxcolor=0x101213@0.72:boxborderw=26:alpha='${fadeA(a, b)}'`;
// each caption hands over to the next halfway through the transition between them
const caps = S.map((s, i) => [s[2], i ? starts[i] + S[i - 1][4] * 0.5 : 0, i < S.length - 1 ? starts[i + 1] + S[i][4] * 0.5 : TA - 2.6]); caps.push(['After', TA - 2.6, TA + 0.01]);
const brand = `drawtext=fontfile='${FONT}':text='Mor Smes veg 11C · Stue':fontsize=28:fontcolor=0xF4F1EA:x=60:y=48:box=1:boxcolor=0x101213@0.5:boxborderw=16`;
const inputs = [], f = [];
// the render lines up with the photo when scaled 1.75x and offset (55, 177); the evening stage fills any uncovered edge
const base = (i, label, pre = '') => `[${i}:v]${pre}scale=2528:1686:flags=lanczos,setsar=1[${label}]`;
S.forEach(([img, L], i) => inputs.push('-loop', '1', '-t', String(L), '-i', img));
inputs.push('-loop', '1', '-t', String(S[S.length - 1][1]), '-i', ai('s6r-evening.png'));
const nS = S.length, EVE = nS;
S.forEach(([img], i) => { if (i < nS - 1) f.push(`${base(i, `p${i}`)};[p${i}]crop=2528:1422:0:150,fps=30,format=yuv444p[s${i}]`); });
f.push(`[${nS - 1}:v]scale=2534:1900:flags=lanczos,unsharp=5:5:0.6,setsar=1[rr]`, `${base(EVE, 'ev')}`, `[ev][rr]overlay=55:177:shortest=1,crop=2528:1422:0:150,fps=30,format=yuv444p[s${nS - 1}]`);
let prev = 's0'; for (let i = 0; i < nS - 1; i++) { f.push(`[${prev}][s${i + 1}]xfade=transition=${S[i][3]}:duration=${S[i][4]}:offset=${starts[i + 1].toFixed(3)}[x${i}]`); prev = `x${i}`; }
f.push(`[${prev}]scale=w='trunc(2528*(1+0.10*t/${TA})/2)*2':h=-2:eval=frame:flags=bicubic,crop=2528:1422:'(iw-2528)*0.56':'(ih-1422)*0.5',scale=1920:1080:flags=lanczos,${caps.map(c => cap(...c)).join(',')},${brand},format=yuv420p[A]`);
// before / after slider: the real photo and the render, slightly zoomed so the aligned edges stay hidden
const TB = 7, nIn = nS + 1;
inputs.push('-loop', '1', '-t', String(TB), '-i', PHOTO, '-loop', '1', '-t', String(TB), '-i', RENDER, '-loop', '1', '-t', String(TB), '-i', ai('s6r-evening.png'));
const zoomCrop = 'crop=2386:1342:(2528-2386)*0.56:150+(1422-1342)*0.5,scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv444p';
f.push(`${base(nIn, 'q0')};[q0]${zoomCrop}[b0]`);
f.push(`[${nIn + 1}:v]scale=2534:1900:flags=lanczos,unsharp=5:5:0.6,setsar=1[rr2]`, `${base(nIn + 2, 'ev2')}`, `[ev2][rr2]overlay=55:177:shortest=1,${zoomCrop}[b1]`);
const d = `if(lt(T\\,1.6)\\,1920-960*(1-cos(PI*T/1.6))/2\\,if(lt(T\\,5.2)\\,960+430*sin((T-1.6)*1.75)\\,960+430*sin(3.6*1.75)*(1-(T-5.2)/1.8)))`;
const side = v => `'if(lt(abs(X-(${d}))\\,3)\\,${v}\\,if(gt(X\\,${d})\\,B\\,A))'`;
f.push(`[b0][b1]blend=c0_expr=${side(232)}:c1_expr=${side(128)}:c2_expr=${side(128)},format=yuv420p,` +
  `drawtext=fontfile='${FONT}':text='Before':fontsize=40:fontcolor=0xF4F1EA:x=70:y=h-140:box=1:boxcolor=0x101213@0.72:boxborderw=22,` +
  `drawtext=fontfile='${FONT}':text='After':fontsize=40:fontcolor=0xF4F1EA:x=w-tw-70:y=h-140:box=1:boxcolor=0x101213@0.72:boxborderw=22,${brand}[B]`);
f.push(`[A][B]concat=n=2:v=1:a=0,scale=in_range=full:out_range=tv,format=yuv420p[out]`); // standard video range plays right on phones
fs.mkdirSync(tmp, { recursive: true }); const script = path.join(tmp, 'render-film-filter.txt'); fs.writeFileSync(script, f.join(';\n'));
const out = path.join(dir, 'stue-render-film.mp4');
execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-/filter_complex', script, '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, 'length', (TA + TB).toFixed(1), 's; stage starts', starts.map(s => s.toFixed(1)).join(', '));
