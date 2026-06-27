/**
 * Fonnte WhatsApp message sender for magic-link delivery.
 *
 * Fonnte API: POST https://api.fonnte.com/send with Authorization header
 * equal to the token (no "Bearer" prefix) and a JSON body:
 *   { target: "628xxx", message: "..." }
 *
 * The database stores canonical `+62...`; Fonnte wants digits-only, so we
 * convert with toFonnteTarget() at the boundary.
 *
 * On any failure (network, non-200, or status:false) we return false so the
 * caller can invalidate the magic link and emit a generic response. We never
 * leak provider details to the frontend.
 */

import { toFonnteTarget } from './phone.js';

const FONNTE_ENDPOINT = 'https://api.fonnte.com/send';

/** Compose the WhatsApp message body containing the magic link. */
function composeMessage(magicLinkUrl) {
  return [
    'AppVibe Vault — Tautan Akses Anda',
    '',
    'Gunakan tautan berikut untuk masuk ke akun AppVibe Vault Anda. Tautan ini hanya berlaku 15 menit dan dapat digunakan satu kali.',
    '',
    magicLinkUrl,
    '',
    'Jika Anda tidak meminta tautan ini, abaikan pesan ini.',
  ].join('\n');
}

/**
 * Send a magic link via Fonnte.
 *
 * @param {object} opts
 * @param {string} opts.token       FONNTE_TOKEN
 * @param {string} opts.to          Canonical +62... phone
 * @param {string} opts.magicLinkUrl Full verify URL with token
 * @param {function} [opts.fetchImpl] Injectable fetch (tests)
 * @returns {Promise<boolean>} true on confirmed delivery
 */
export async function sendMagicLinkWhatsApp({ token, to, magicLinkUrl, fetchImpl = fetch }) {
  if (!token) throw new Error('FONNTE_TOKEN is required');

  const body = JSON.stringify({
    target: toFonnteTarget(to),
    message: composeMessage(magicLinkUrl),
  });

  let res;
  try {
    res = await fetchImpl(FONNTE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body,
    });
  } catch {
    // Network error — do not leak details.
    return false;
  }

  if (!res.ok) return false;

  let data;
  try {
    data = await res.json();
  } catch {
    return false;
  }

  // Fonnte returns { status: true } on success.
  return data?.status === true;
}
