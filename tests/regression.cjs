// Run with Playwright installed: node tests/regression.cjs
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.route('http://trash.test/**', r => {
      const file = new URL(r.request().url()).pathname === '/scroll-lock.js' ? 'scroll-lock.js' : 'index.html';
      return r.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : 'text/html', body: readFileSync(join(__dirname, '..', file), 'utf8') });
    });
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.failStorage) throw new DOMException('Full', 'QuotaExceededError');
        return set.apply(this, args);
      };
    });
    await page.goto('http://trash.test/');
    await page.clock.install();
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('trashdex-v1')));
    const fail = value => page.evaluate(v => { window.failStorage = v; }, value);
    const click = selector => page.locator(selector).first().dispatchEvent('click');
    await fail(true);
    await click('#clearEx');
    assert.equal(await page.locator('#pending .item').count(), 3);
    assert.match(await page.locator('#toastMsg').textContent(), /儲存失敗/);
    await fail(false);
    await click('#clearEx');
    await click('#btnQuick');
    await page.locator('#sheetName').fill('Test bag');
    await fail(true);
    await click('#sheetOk');
    assert.equal(await page.locator('#sheet').isVisible(), true);
    assert.equal((await stored()).items.length, 0);
    await fail(false);
    await click('#sheetOk');
    assert.equal((await stored()).seq, 1);
    assert.equal((await stored()).items.length, 1);
    await fail(true);
    await click('[data-throw]');
    await page.clock.runFor(460);
    assert.equal((await stored()).items[0].thrownAt, null);
    assert.equal(await page.locator('#pending .item').count(), 1);
    await fail(false);
    // The second click used to queue a second timeout, which discarded again after Undo.
    await click('[data-throw]');
    await page.clock.runFor(200);
    await click('[data-throw]');
    await page.clock.runFor(260);
    assert.equal(await page.locator('#thrown .entry').count(), 1);
    await click('#toastUndo');
    await page.clock.runFor(200);
    assert.equal((await stored()).items[0].thrownAt, null);
    assert.equal(await page.locator('#pending .item').count(), 1);
    // Failed undo must not change the receipt or the saved record.
    await click('[data-throw]');
    await page.clock.runFor(460);
    await fail(true);
    await click('#toastUndo');
    assert.ok((await stored()).items[0].thrownAt);
    assert.equal(await page.locator('#thrown .entry').count(), 1);
    await fail(false);
    await page.reload();
    assert.equal(await page.locator('#thrown .entry').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Removing examples during an animation must not announce a phantom discard.
    await page.evaluate(() => localStorage.removeItem('trashdex-v1'));
    await page.reload();
    await click('[data-throw]:first-of-type');
    await click('#clearEx');
    await page.clock.runFor(460);
    assert.equal((await stored()).items.length, 0);
    assert.equal(await page.locator('#toastUndo').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: storage failures, retry, discard/undo race, reload, example removal, mobile overflow, and browser errors');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
