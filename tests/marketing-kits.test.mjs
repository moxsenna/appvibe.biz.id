import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractPlainText,
  getKitTitle,
  hasKit,
  getKitHtml,
} from '../functions/lib/marketing-kits.js';

test('extractPlainText strips tags and preserves words', () => {
  const html = '<html><body><h1>Hello</h1><p>World [NAMA BRAND]</p></body></html>';
  const text = extractPlainText(html);
  assert.match(text, /Hello/);
  assert.match(text, /World/);
  assert.match(text, /\[NAMA BRAND\]/);
  assert.doesNotMatch(text, /<h1>/);
});

test('getKitTitle reads document title', () => {
  assert.equal(getKitTitle('<title>Adsprint — Template</title><body></body>'), 'Adsprint — Template');
});

test('hasKit and getKitHtml for known appId', () => {
  assert.equal(hasKit('adsprint'), true);
  assert.ok(getKitHtml('adsprint')?.includes('<!doctype html>'));
  assert.equal(hasKit('not_an_app'), false);
  assert.equal(getKitHtml('not_an_app'), null);
});