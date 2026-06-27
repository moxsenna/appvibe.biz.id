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

test('admin panel exposes app link settings without query-token auth', () => {
  const html = readFileSync(join(root, 'admin', 'index.html'), 'utf8');

  assert.match(html, /Pengaturan/);
  assert.match(html, /\/api\/admin\/app-links/);
  assert.match(html, /Authorization\s*:\s*`Bearer \$\{token\}`/);
  assert.doesNotMatch(html, /\?token=/);
});

test('gitignore excludes local secret files and audit screenshots', () => {
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');

  assert.match(gitignore, /^\.staging\.vars$/m);
  assert.match(gitignore, /^audit-\*\.png$/m);
  assert.match(gitignore, /^check-\*\.png$/m);
  assert.match(gitignore, /^topbar-\*\.png$/m);
  assert.doesNotMatch(gitignore, /"audit-\*\.png"/);
});

test('security headers include CSP, HSTS, and Permissions-Policy', () => {
  const headers = readFileSync(join(root, 'public', '_headers'), 'utf8');

  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /Permissions-Policy:/);
  assert.match(headers, /frame-ancestors 'none'/);
});

test('public pages use appvibe.biz.id canonicals and no placeholder ad IDs', () => {
  const files = ['index.html', 'privacy/index.html', 'terms/index.html', 'license/index.html'];
  const html = files.map((file) => readFileSync(join(root, file), 'utf8')).join('\n');

  assert.doesNotMatch(html, /appvibe\.web\.id/);
  assert.doesNotMatch(html, /GTM-XXXXXXX/);
  assert.doesNotMatch(html, /G-XXXXXXXXXX/);
  assert.doesNotMatch(html, /000000000000000/);
  assert.match(html, /https:\/\/appvibe\.biz\.id\//);
});
