/**
 * Branded HTML error pages for browser-facing endpoints (/api/member/launch,
 * /api/member/resource). When these endpoints are opened in a browser tab
 * (via window.open or direct navigation), returning raw JSON is a poor UX.
 * This helper returns an HTML page with the error message and a CTA back
 * to /access/.
 *
 * API callers (fetch) still receive JSON. This is detected via Accept header.
 */

const APP_ORIGIN = 'https://appvibe.biz.id';

/**
 * Return a branded error response. If the request looks like a browser
 * navigation (Accept contains text/html), return an HTML page. Otherwise
 * return JSON for API callers.
 */
export function errorResponse(request, { status, error, message }) {
  const accept = request.headers.get('Accept') || '';
  const isBrowser = accept.includes('text/html');

  if (isBrowser) {
    const title = {
      400: 'Permintaan Tidak Valid',
      401: 'Sesi Berakhir',
      403: 'Akses Ditolak',
      404: 'Tidak Ditemukan',
      503: 'Belum Tersedia',
    }[status] || 'Terjadi Kesalahan';

    const hint = {
      401: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
      403: 'Anda tidak memiliki akses ke item ini.',
      503: 'Sumber daya ini belum dikonfigurasi. Hubungi support jika Anda memerlukan bantuan.',
    }[status] || 'Silakan kembali ke portal dan coba lagi.';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${title} — AppVibe</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#EEF3FA;color:#10203F;display:flex;align-items:center;justify-content:center;min-height:100vh;-webkit-font-smoothing:antialiased}
.card{max-width:440px;width:calc(100% - 32px);text-align:center;background:#fff;border:1px solid #E2EAF5;border-radius:28px;padding:clamp(28px,5vw,48px);box-shadow:0 12px 30px rgba(10,28,66,0.08)}
.code{font-family:'DM Mono',monospace;font-size:clamp(48px,8vw,72px);font-weight:700;letter-spacing:-.04em;background:linear-gradient(135deg,#126BFF 0%,#10DCD5 48%,#8756FF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:8px}
h1{margin:0 0 8px;font-family:'Space Grotesk',sans-serif;font-size:clamp(20px,3.5vw,28px);letter-spacing:-.03em}
p{margin:0 0 24px;color:#66748D;font-size:14px;line-height:1.6}
a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 28px;border-radius:14px;background:#126BFF;color:#fff;font-weight:700;font-size:14px;text-decoration:none;transition:background .14s}
a.btn:hover{background:#2579ff}
a.btn:focus-visible{outline:2px solid #126BFF;outline-offset:2px}
</style>
</head>
<body>
<div class="card">
  <div class="code">${status}</div>
  <h1>${title}</h1>
  <p>${message || hint}</p>
  <a class="btn" href="/access/">Kembali ke AppVibe Vault</a>
</div>
</body>
</html>`;

    return new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }

  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
