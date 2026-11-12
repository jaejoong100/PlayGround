import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const output = process.env.CAPTURE_DIR;
const url = process.env.CAPTURE_URL;
if (!output || !url) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.');
  process.exit(1);
}
try {
  new URL(url);
} catch {
  console.error(`CAPTURE_URL is not a valid absolute URL: ${url}`);
  process.exit(1);
}

const timed = async (label, action) => {
  const started = performance.now();
  try {
    return await action();
  } finally {
    console.log(`${label}: ${(performance.now() - started).toFixed(0)}ms`);
  }
};
const temporary = (message, cause) => Object.assign(new Error(message, { cause }), { exitCode: 75 });
let browser;
let exitCode = 0;
try {
  const runtime = join(process.env.HOME || '', '.local/share/omgithub-playwright');
  let chromium;
  let config;
  try {
    const require = createRequire(join(runtime, 'package.json'));
    ({ chromium } = require('playwright'));
    const configPath = join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json');
    config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (process.platform === 'linux' && !process.env.DISPLAY) {
      process.env.DISPLAY = `:${readFileSync(join(runtime, 'display'), 'utf8').trim()}`;
    }
  } catch (error) {
    throw temporary('Capture browser runtime is unavailable.', error);
  }
  mkdirSync(resolve(output), { recursive: true });
  const origin = new URL(url).origin;

  browser = await timed('browser launch', () => chromium.launch({
    ...config.browser.launchOptions,
    timeout: 30000,
  }).catch(error => { throw temporary('Could not launch the capture browser.', error); }));

  for (const [name, width, height, isMobile] of [
    ['desktop', 1440, 900, false],
    ['mobile', 390, 844, true],
  ]) {
    const page = await timed(`${name} page creation`, () => browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile,
      hasTouch: isMobile,
    }).catch(error => { throw temporary(`Could not create ${name} capture page.`, error); }));
    page.setDefaultTimeout(20000);
    const pageErrors = [];
    const badResponses = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) {
        badResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    let response;
    try {
      response = await timed(`${name} navigation`, () => page.goto(url, {
        waitUntil: 'load',
        timeout: 45000,
      }));
    } catch (error) {
      await page.close().catch(() => {});
      throw temporary(`Navigation failed for ${name} capture at ${url}.`, error);
    }
    if (!response) {
      await page.close().catch(() => {});
      throw temporary(`No HTTP response for ${name} capture at ${url}.`);
    }
    const status = response.status();
    if (!response.ok()) {
      await page.close().catch(() => {});
      if ([408, 429, 502, 503, 504].includes(status)) {
        throw temporary(`Temporary preview response HTTP ${status} at ${url}.`);
      }
      throw new Error(`Preview returned HTTP ${status} at ${url}.`);
    }

    try {
      await timed(`${name} rendered-content wait`, async () => {
        await page.locator('#screenTitle').waitFor({ state: 'visible' });
        await page.locator('#btnPlay').waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const canvas = document.querySelector('#game');
          const title = document.querySelector('#screenTitle');
          if (!canvas || !title || canvas.width < 2 || canvas.height < 2) return false;
          const rect = canvas.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2 || !document.fonts || document.fonts.status !== 'loaded') return false;
          const context = canvas.getContext('2d');
          if (!context) return false;
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let colored = 0;
          for (let i = 0; i < pixels.length; i += 4 * 128) {
            if (pixels[i + 3] > 0) colored++;
            if (colored > 8) return true;
          }
          return false;
        }, { timeout: 20000 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      });
    } catch (error) {
      await page.close().catch(() => {});
      throw new Error(`${name} view did not render the game title and animated canvas.`, { cause: error });
    }

    if (pageErrors.length || badResponses.length) {
      await page.close().catch(() => {});
      throw new Error(`${name} view has runtime/rendering failures: ${[...pageErrors, ...badResponses].join('; ')}`);
    }

    const screenshotPath = join(resolve(output), `final-${name}.png`);
    await timed(`${name} screenshot`, () => page.screenshot({ path: screenshotPath, timeout: 30000 })
      .catch(error => { throw temporary(`Could not capture ${name} screenshot.`, error); }));
    await page.close();
    if (statSync(screenshotPath).size < 1000) {
      throw new Error(`${name} screenshot is unexpectedly small: ${screenshotPath}`);
    }
    console.log(`Saved ${screenshotPath}`);
  }
} catch (error) {
  console.error(error);
  exitCode = error.exitCode || 1;
} finally {
  if (browser) {
    try {
      await timed('browser close', () => browser.close());
    } catch (error) {
      console.error('Could not close the capture browser:', error);
      exitCode ||= 75;
    }
  }
}
process.exitCode = exitCode;
