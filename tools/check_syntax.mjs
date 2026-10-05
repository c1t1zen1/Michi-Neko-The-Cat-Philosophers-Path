// Syntax-check every ES module in src/.
//
// This Node build's `node --check <file>` always treats .js as CommonJS, so
// the only reliable route is `--input-type=module --check` fed over stdin.
// PowerShell has no `<` operator, hence this wrapper.
//
// Files carry a UTF-8 BOM (harmless to the browser, a parse error to node);
// it is stripped only in the copy handed to node.
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const files = readdirSync('src').filter((f) => f.endsWith('.js'));
let failed = 0;

for (const f of files) {
  const raw = readFileSync(join('src', f), 'utf8');
  const src = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], {
      input: src,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('OK   ' + f);
  } catch (e) {
    failed++;
    console.log('FAIL ' + f);
    console.log(String(e.stderr || e.message));
  }
}

console.log(failed ? `\n${failed} module(s) failed` : `\nAll ${files.length} modules OK`);
process.exit(failed ? 1 : 0);
