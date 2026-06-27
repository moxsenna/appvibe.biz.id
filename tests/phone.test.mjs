import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizePhone, toFonnteTarget, isValidIndonesianMobile } from '../functions/lib/phone.js';

test('normalizes leading-zero local format', () => {
  assert.equal(normalizePhone('081234567890'), '+6281234567890');
});

test('normalizes format without trunk prefix', () => {
  assert.equal(normalizePhone('81234567890'), '+6281234567890');
});

test('normalizes already-canonical +62 format', () => {
  assert.equal(normalizePhone('+6281234567890'), '+6281234567890');
});

test('normalizes 62-prefixed format without plus', () => {
  assert.equal(normalizePhone('6281234567890'), '+6281234567890');
});

test('strips whitespace, dashes and spaces', () => {
  assert.equal(normalizePhone('0812-3456 7890'), '+6281234567890');
  assert.equal(normalizePhone(' 0812 3456 7890 '), '+6281234567890');
});

test('converts canonical e.164 to fonnte target (no plus)', () => {
  assert.equal(toFonnteTarget('+6281234567890'), '6281234567890');
});

test('rejects non-Indonesian country code', () => {
  assert.equal(isValidIndonesianMobile('+12125550199'), false);
  assert.throws(() => normalizePhone('+12125550199'), /invalid.*phone/i);
});

test('rejects landline-style (does not start with 8 after prefix)', () => {
  assert.equal(isValidIndonesianMobile('0215550199'), false);
  assert.throws(() => normalizePhone('0215550199'), /invalid.*phone/i);
});

test('rejects too-short numbers', () => {
  assert.throws(() => normalizePhone('0812'), /invalid.*phone/i);
});

test('rejects letters and garbage', () => {
  assert.throws(() => normalizePhone('bukan nomor'), /invalid.*phone/i);
  assert.throws(() => normalizePhone('08abc'), /invalid.*phone/i);
});

test('rejects empty input', () => {
  assert.throws(() => normalizePhone(''), /invalid.*phone/i);
  assert.throws(() => normalizePhone('   '), /invalid.*phone/i);
});

test('accepts valid 9-digit national significant number', () => {
  // 62 + 9 digits starting with 8
  assert.equal(normalizePhone('0812345678'), '+6281234567 8'.replace(/\s/g, ''));
});

test('accepts valid 12-digit national significant number', () => {
  // 62 + 12 digits starting with 8
  assert.equal(normalizePhone('0812345678901'), '+62812345678901');
});
