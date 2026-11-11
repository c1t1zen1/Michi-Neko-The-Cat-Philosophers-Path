// Optional integration-test dependency. Keep Playwright and browser binaries
// outside the buildless application; an existing installation can be reused.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
export const BASE = (process.env.CATALOG_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
export const OUTPUT = process.env.CATALOG_QA_DIR || join(tmpdir(), 'michi-catalog-qa');
export async function launchBrowser() {
  let chromium;
  try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
  catch { throw new Error('Install Playwright outside this checkout, or set PLAYWRIGHT_MODULE to its package directory. See catalog/README.md.'); }
  await mkdir(OUTPUT, { recursive: true });
  return chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), args: process.platform === 'darwin' ? ['--use-angle=metal'] : ['--enable-webgl'], timeout: 60000 });
}
export async function saveReport(name, report) { await writeFile(join(OUTPUT, name), JSON.stringify(report, null, 2) + '\n'); }
