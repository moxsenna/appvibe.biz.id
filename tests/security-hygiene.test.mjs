import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

test('admin panel sends token via Authorization header only', () => {
  const html = readFileSync(join(root, 'admin', 'index.html'), 'utf8');

  assert.doesNotMatch(html, /localStorage/);
  assert.doesNotMatch(html, /\?token=/);
  assert.match(html, /Authorization\s*:\s*`Bearer \$\{token\}`/);
});

test('gitignore excludes local secret files and audit screenshots', () => {
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');

  assert.match(gitignore, /^\.staging\.vars$/m);
  assert.match(gitignore, /^audit-\*\.png$/m);
  assert.match(gitignore, /^check-\*\.png$/m);
  assert.match(gitignore, /^topbar-\*\.png$/m);
  assert.doesNotMatch(gitignore, /"audit-\*\.png"/);
});
