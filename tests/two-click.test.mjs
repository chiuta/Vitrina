// Teste v2.0.0: încorporare „în două clicuri" (substituent fără contact Meta), copiere în lot, test de afișare.
import {createRequire as __fffCR} from 'node:module';
import {readFileSync as __fffRF} from 'node:fs';
import {createRequire} from 'module';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
const APP = JSON.parse(__fffRF(new URL('../app.json', import.meta.url), 'utf8'));
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.resolve(here, '..', 'index.html');
const AXE = __fffAxe();
let ok = 0, bad = 0;
function t(name, cond, extra) { if (cond) { ok++; console.log('  ok  ' + name); } else { bad++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); } }
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});

async function open(w, h) {
  const ctx = await b.newContext({viewport: {width: w, height: h}, locale: 'ro-RO'});
  const reqs = []; await ctx.route(/^https?:/, (r) => { reqs.push(r.request().url()); r.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.addInitScript(() => { window.__clip = []; Object.defineProperty(navigator, 'clipboard', {value: {writeText: (x) => { window.__clip.push(x); return Promise.resolve(); }}, configurable: true}); });
  await p.goto(FILE); await p.waitForTimeout(800);
  return {ctx, p, errs, reqs};
}
const show = async (p, u) => { await p.fill('#urlInput', u); await p.click('#form button[type=submit]', {noWaitAfter: true}); await p.waitForTimeout(150); };
const POST = 'https://www.facebook.com/somepage/posts/1234567890';

console.log('Versiune și butoane');
{
  const {ctx, p, errs, reqs} = await open(1280, 800);
  t('versiune ' + APP.version, await p.evaluate((v) => document.querySelector('meta[name=application-version]').content === v, APP.version));
  t('fără pageerror', errs.length === 0, errs.join('|'));
  await show(p, 'https://www.facebook.com/groups/abc/');
  t('secțiune nesuportată: fără butonul „două clicuri"', await p.isHidden('#copy2cBtn') && await p.isHidden('#tcTestBtn'));
  await show(p, POST);
  t('postare: butonul „două clicuri" vizibil', await p.isVisible('#copy2cBtn') && await p.isVisible('#tcTestBtn'));

  console.log('Cod generat');
  await p.click('#copy2cBtn');
  const code = await p.evaluate(() => window.__clip[window.__clip.length - 1]);
  t('codul conține substituent și script, nu iframe static', /<div id="vtr-[0-9a-f]{10}"/.test(code) && /<script>/.test(code) && !/<iframe /.test(code.split('<script>')[0]));
  t('marcajul (în afara scriptului) nu conține URL de plugin Meta', !/plugins\//.test(code.split('<script>')[0]));
  t('textul de consimțământ în română', /Meta primește adresa ta IP/.test(code));

  // codul într-o pagină terță: zero cereri către Meta până la clic
  const ctx2 = await b.newContext(); const fb = []; await ctx2.route(/^https?:/, (r) => { fb.push(r.request().url()); r.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}); });
  const q = await ctx2.newPage(); const qerr = []; q.on('pageerror', (e) => qerr.push(e.message));
  await q.setContent('<!doctype html><meta charset=utf-8><body><h1>Site</h1>' + code + '</body>');
  await q.waitForTimeout(500);
  t('zero cereri înainte de acceptare', fb.length === 0, fb.join(','));
  t('niciun iframe înainte de clic', await q.locator('iframe').count() === 0);
  await q.click('#' + code.match(/id="(vtr-[0-9a-f]+)"/)[1] + ' button');
  await q.waitForTimeout(500);
  const src = await q.locator('iframe').getAttribute('src');
  t('după clic apare iframe-ul către plugins/post.php', /^https:\/\/www\.facebook\.com\/plugins\/post\.php\?href=/.test(src) && src.includes(encodeURIComponent(POST)), src);
  t('după clic se face cerere către facebook.com', fb.some((u) => u.includes('facebook.com/plugins/post.php')));
  t('script fără erori', qerr.length === 0, qerr.join('|'));
  await ctx2.close();

  console.log('Cod pentru pagină (scrolling=no) și limbă');
  await show(p, 'https://www.facebook.com/somepage');
  await p.click('#copy2cBtn');
  const codeP = await p.evaluate(() => window.__clip[window.__clip.length - 1]);
  t('pagină: plugins/page.php și scrolling no', codeP.includes('plugins\\/page.php') || codeP.includes('plugins/page.php'), codeP.slice(0, 100));
  t('pagină: scrolling no', /setAttribute\("scrolling","no"\)/.test(codeP));
  await p.selectOption('#langSelect', 'en');
  await p.click('#copy2cBtn');
  const codeEn = await p.evaluate(() => window.__clip[window.__clip.length - 1]);
  t('limba UI → textul substituentului (en)', /Load content from Meta/.test(codeEn) && /This content is hosted by Facebook/.test(codeEn));
  await p.selectOption('#langSelect', 'ro');

  console.log('Lot din istoric');
  await show(p, 'https://www.facebook.com/somepage/videos/987654321');
  await show(p, 'https://www.facebook.com/groups/abc/');
  await p.click('#copyBatchBtn'); await p.waitForTimeout(400);
  const batch = await p.evaluate(() => window.__clip[window.__clip.length - 1]);
  const n = (batch.match(/<div id="vtr-/g) || []).length;
  t('lotul conține doar elementele încorporabile (post, pagină, video = 3)', n === 3, 'n=' + n);
  t('ID-uri unice în lot', new Set(batch.match(/id="vtr-[0-9a-f]+"/g)).size === 3);
  t('mesaj de confirmare cu număr', /3 coduri copiate/.test(await p.textContent('#copyStatus')));
  t('video: plugins/video.php în lot', /plugins\/video\.php/.test(batch));

  console.log('Test de afișare');
  await show(p, POST);
  const before = reqs.filter((u) => u.includes('/plugins/post.php')).length;
  await p.click('#tcTestBtn');
  t('previzualizarea apare', await p.isVisible('#tcPreview') && await p.isVisible('#tcPreviewBox button'));
  t('previzualizarea nu conține iframe', await p.locator('#tcPreviewBox iframe').count() === 0);
  await p.click('#tcPreviewBox button'); await p.waitForTimeout(300);
  t('clic în previzualizare → iframe', await p.locator('#tcPreviewBox iframe').count() === 1);
  t('previzualizarea se închide la o nouă afișare', (await show(p, POST), await p.isHidden('#tcPreview')));
  await ctx.close();
}
console.log('Accesibilitate');
if (AXE) {
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, bypassCSP: true}); await ctx.route(/^https?:/, (r) => r.fulfill({status: 200, contentType: 'text/html', body: '<title>s</title>'}));
  const p = await ctx.newPage(); await p.goto(FILE); await p.waitForTimeout(800);
  await show(p, POST); await p.click('#tcTestBtn');
  await p.addScriptTag({content: fs.readFileSync(AXE, 'utf8')});
  const v = await p.evaluate(async () => (await axe.run(document)).violations.map((x) => x.id + ':' + x.nodes.length));
  t('axe 0 violări cu previzualizarea deschisă', v.length === 0, v.join(','));
  await ctx.close();
}
console.log('Mobil 390px');
{
  const {ctx, p} = await open(390, 800);
  await show(p, POST); await p.click('#tcTestBtn');
  t('fără defilare orizontală', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();
}
await b.close();
console.log(`\n${ok} ok, ${bad} eșuate`);
process.exit(bad ? 1 : 0);
