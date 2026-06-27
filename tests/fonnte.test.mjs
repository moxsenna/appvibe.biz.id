import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sendMagicLinkWhatsApp } from '../functions/lib/fonnte.js';

test('sendMagicLinkWhatsApp posts to fonnte with correct payload and target', async () => {
  const calls = [];
  const token = 'fonnte_token_xyz';
  const result = await sendMagicLinkWhatsApp({
    token,
    to: '+6281234567890',
    magicLinkUrl: 'https://appvibe.biz.id/access/verify?token=abc',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ status: true, message: 'success' }, { status: 200 });
    },
  });

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /fonnte\.com/i);

  const body = JSON.parse(calls[0].init.body);
  // Fonnte target is digits-only, no plus.
  assert.equal(body.target, '6281234567890');
  assert.ok(typeof body.message === 'string' && body.message.length > 0);
  assert.equal(calls[0].init.headers.Authorization, token);
});

test('sendMagicLinkWhatsApp message contains the magic link url', async () => {
  const calls = [];
  await sendMagicLinkWhatsApp({
    token: 'tok',
    to: '+6281234567890',
    magicLinkUrl: 'https://appvibe.biz.id/access/verify?token=SECRET123',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ status: true }, { status: 200 });
    },
  });
  const body = JSON.parse(calls[0].init.body);
  assert.ok(body.message.includes('https://appvibe.biz.id/access/verify?token=SECRET123'));
});

test('sendMagicLinkWhatsApp returns false when fonnte reports failure', async () => {
  const result = await sendMagicLinkWhatsApp({
    token: 'tok',
    to: '+6281234567890',
    magicLinkUrl: 'https://appvibe.biz.id/access/verify?token=abc',
    fetchImpl: async () => Response.json({ status: false, reason: 'invalid_number' }, { status: 200 }),
  });
  assert.equal(result, false);
});

test('sendMagicLinkWhatsApp returns false on network error', async () => {
  const result = await sendMagicLinkWhatsApp({
    token: 'tok',
    to: '+6281234567890',
    magicLinkUrl: 'https://appvibe.biz.id/access/verify?token=abc',
    fetchImpl: async () => { throw new Error('network down'); },
  });
  assert.equal(result, false);
});

test('sendMagicLinkWhatsApp returns false on non-200 http status', async () => {
  const result = await sendMagicLinkWhatsApp({
    token: 'tok',
    to: '+6281234567890',
    magicLinkUrl: 'https://appvibe.biz.id/access/verify?token=abc',
    fetchImpl: async () => Response.json({}, { status: 500 }),
  });
  assert.equal(result, false);
});

test('sendMagicLinkWhatsApp throws when token is missing', async () => {
  await assert.rejects(
    () => sendMagicLinkWhatsApp({ token: '', to: '+6281234567890', magicLinkUrl: 'https://x', fetchImpl: async () => Response.json({ status: true }) }),
    /token/i,
  );
});
