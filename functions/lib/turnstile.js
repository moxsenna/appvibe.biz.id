const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')
    || '';
}

export async function verifyTurnstile({ secret, token, remoteip, fetchImpl = fetch }) {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: 'missing_token' };

  const formData = new FormData();
  formData.set('secret', secret);
  formData.set('response', token);
  if (remoteip) formData.set('remoteip', remoteip);

  const response = await fetchImpl(VERIFY_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) return { ok: false, error: 'verify_http_error' };

  const data = await response.json().catch(() => ({}));
  return {
    ok: data.success === true,
    error: data.success === true ? null : 'verification_failed',
    codes: Array.isArray(data['error-codes']) ? data['error-codes'] : [],
  };
}
