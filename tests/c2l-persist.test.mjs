// Teste v2.2.0: „clic pentru încărcare” se poate reține (localStorage, try/catch), oprit implicit.
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.resolve(here, '..', 'index.html');
let ok = 0, bad = 0;
const t = (n, c, x) => { if (c) { ok++; console.log('  ok  ' + n); } else { bad++; console.log('  FAIL ' + n + (x ? ' :: ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const U = 'https://www.facebook.com/exemplu';
async function mk(init) {
  const ctx = await b.newContext({locale: 'ro-RO'});
  const reqs = [];
  await ctx.route(/^https?:/, (r) => { reqs.push(r.request().url()); r.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  if (init) await p.addInitScript(init);
  await p.goto(FILE); await p.waitForTimeout(500);
  return {ctx, p, errs, reqs};
}
{
  const {ctx, p, errs, reqs} = await mk();
  t('prima vizită: oprit implicit', await p.evaluate(() => !document.getElementById('c2lChk').checked));
  t('eticheta spune că alegerea se reține', /se reține/.test(await p.textContent('.c2l-row')));
  await p.check('#c2lChk');
  t('bifarea scrie cheia vitrina_c2l=1', await p.evaluate(() => localStorage.getItem('vitrina_c2l')) === '1');
  await p.reload(); await p.waitForTimeout(500);
  t('după reîncărcare rămâne bifat', await p.evaluate(() => document.getElementById('c2lChk').checked));
  reqs.length = 0;
  await p.fill('#urlInput', U); await p.click('button[type=submit]'); await p.waitForTimeout(500);
  t('după reîncărcare: substituent, nicio cerere către facebook.com', await p.locator('#c2lGo').count() === 1 && reqs.filter((u) => /facebook\.com/.test(u)).length === 0, reqs);
  await p.uncheck('#c2lChk');
  t('debifarea șterge cheia', await p.evaluate(() => localStorage.getItem('vitrina_c2l')) === null);
  await p.reload(); await p.waitForTimeout(500);
  t('după debifare și reîncărcare: oprit', await p.evaluate(() => !document.getElementById('c2lChk').checked));
  t('fără erori', errs.length === 0, errs);
  await ctx.close();
}
{
  const {ctx, p, errs} = await mk(() => { Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocat'); }}); });
  t('localStorage blocat: aplicația pornește, oprit implicit', await p.evaluate(() => !document.getElementById('c2lChk').checked) && errs.length === 0, errs);
  await p.check('#c2lChk'); await p.fill('#urlInput', U); await p.click('button[type=submit]'); await p.waitForTimeout(400);
  t('localStorage blocat: modul funcționează pe sesiune (substituent)', await p.locator('#c2lGo').count() === 1 && errs.length === 0, errs);
  await ctx.close();
}
{
  const {ctx, p} = await mk(() => { try { localStorage.setItem('vitrina_c2l', '1'); } catch (e) {} });
  await p.evaluate(() => 0);
  t('valoare salvată anterior: bifat la pornire', await p.evaluate(() => document.getElementById('c2lChk').checked));
  await ctx.close();
}
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
