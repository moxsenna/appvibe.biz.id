var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-D7jt6r/functionsWorker-0.1741688748827347.mjs
var __defProp2 = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __esm = /* @__PURE__ */ __name((fn, res, err) => /* @__PURE__ */ __name(function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
}, "__init"), "__esm");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, "__export");
function parseResourceConfig(raw) {
  if (!raw) return { apps: {}, resources: {} };
  try {
    const parsed = JSON.parse(raw);
    return {
      apps: parsed?.apps && typeof parsed.apps === "object" ? parsed.apps : {},
      resources: parsed?.resources && typeof parsed.resources === "object" ? parsed.resources : {}
    };
  } catch {
    return { apps: {}, resources: {} };
  }
}
__name(parseResourceConfig, "parseResourceConfig");
function strictHttps(val) {
  if (!val || typeof val !== "string") return null;
  try {
    const u = new URL(val);
    return u.protocol === "https:" ? val : null;
  } catch {
    return null;
  }
}
__name(strictHttps, "strictHttps");
function getAppLaunchUrl(appId, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  return strictHttps(cfg.apps[appId]);
}
__name(getAppLaunchUrl, "getAppLaunchUrl");
function getBundleResources(bundleId, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  const res = cfg.resources[bundleId] || {};
  return {
    marketing_kit: strictHttps(res.marketing_kit),
    guide: strictHttps(res.guide)
  };
}
__name(getBundleResources, "getBundleResources");
function getResourceAvailability(bundleIds, hasFullVault, rawJson) {
  const cfg = parseResourceConfig(rawJson);
  const apps = {};
  for (const [id, url] of Object.entries(cfg.apps)) {
    apps[id] = !!strictHttps(url);
  }
  const resources = {};
  const relevantBundles = hasFullVault ? ["advertiser", "commerce", "creator", "brand_launch"] : bundleIds;
  for (const bid of relevantBundles) {
    const r = cfg.resources[bid] || {};
    resources[bid] = {
      marketing_kit: !!strictHttps(r.marketing_kit),
      guide: !!strictHttps(r.guide)
    };
  }
  return { apps, resources };
}
__name(getResourceAvailability, "getResourceAvailability");
var init_access_resources = __esm({
  "lib/access-resources.js"() {
    init_functionsRoutes_0_785663823963553();
    __name2(parseResourceConfig, "parseResourceConfig");
    __name2(strictHttps, "strictHttps");
    __name2(getAppLaunchUrl, "getAppLaunchUrl");
    __name2(getBundleResources, "getBundleResources");
    __name2(getResourceAvailability, "getResourceAvailability");
  }
});
function entitlementForPack(packId) {
  const pack = PACKS[packId];
  if (!pack) return null;
  return { resource_type: pack.resourceType, resource_id: packId };
}
__name(entitlementForPack, "entitlementForPack");
function purchaseTypeForPack(packId) {
  if (packId === "vault_full") return "full_vault";
  return "initial_bundle";
}
__name(purchaseTypeForPack, "purchaseTypeForPack");
var PACKS;
var VALID_PACK_IDS;
var ALL_APP_IDS;
var init_packs = __esm({
  "lib/packs.js"() {
    init_functionsRoutes_0_785663823963553();
    PACKS = {
      advertiser: {
        product_key: "pack_advertiser",
        description: "White-Label Vault \u2014 Advertiser App Pack",
        amount: 97e3,
        currency: "IDR",
        resourceType: "bundle",
        appIds: ["adsprint", "rupa", "adegan", "bukti", "mula"]
      },
      commerce: {
        product_key: "pack_commerce",
        description: "White-Label Vault \u2014 Commerce & Marketplace Pack",
        amount: 97e3,
        currency: "IDR",
        resourceType: "bundle",
        appIds: ["katalog", "rupa", "bukti", "pikat", "adsprint"]
      },
      creator: {
        product_key: "pack_creator",
        description: "White-Label Vault \u2014 Creator & Affiliate Pack",
        amount: 97e3,
        currency: "IDR",
        resourceType: "bundle",
        appIds: ["pikat", "ritme", "mimik", "rupa", "suara"]
      },
      brand_launch: {
        product_key: "pack_branding",
        description: "White-Label Vault \u2014 Brand & Launch Pack",
        amount: 97e3,
        currency: "IDR",
        resourceType: "bundle",
        appIds: ["arah", "mimik", "mula", "tayang", "cetak"]
      },
      vault_full: {
        product_key: "vault_full_license",
        description: "White-Label AI App Vault \u2014 Full License (13 apps)",
        amount: 147e3,
        currency: "IDR",
        resourceType: "vault",
        appIds: ["adsprint", "rupa", "adegan", "bukti", "mula", "katalog", "pikat", "ritme", "mimik", "suara", "arah", "tayang", "cetak"]
      }
    };
    VALID_PACK_IDS = Object.keys(PACKS);
    ALL_APP_IDS = PACKS.vault_full.appIds;
    __name2(entitlementForPack, "entitlementForPack");
    __name2(purchaseTypeForPack, "purchaseTypeForPack");
  }
});
function packsForApp(appId) {
  return Object.entries(PACKS).filter(([_, pack]) => pack.appIds.includes(appId)).map(([packId]) => packId);
}
__name(packsForApp, "packsForApp");
var APP_CATALOG;
var ALL_CATALOG_IDS;
var init_catalog = __esm({
  "lib/catalog.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    APP_CATALOG = {
      adsprint: {
        name: "ADSprint",
        label: "ADS",
        function: "Campaign Command Center",
        output: "Riset audience, struktur kampanye, dan ringkasan performa.",
        rebrand: "Campaign Blueprint AI",
        prompt: "Mulai dari satu kampanye iklan. Riset audience, bangun struktur kampanye, lalu ringkas performanya.",
        accent: "#126BFF"
      },
      pikat: {
        name: "PIKAT",
        label: "PIK",
        function: "Affiliate Content Factory",
        output: "Draft konten afiliasi, hook, dan rekomendasi placement.",
        rebrand: "Affiliate Content Engine",
        prompt: "Siapkan konten afiliasi pertama Anda \u2014 draft, hook, dan penempatan dalam satu alur.",
        accent: "#10DCD5"
      },
      rupa: {
        name: "RUPA",
        label: "RPA",
        function: "Visual Commerce Studio",
        output: "Konsep visual produk, deskripsi listing, dan ringkasan katalog.",
        rebrand: "Winning Creative AI",
        prompt: "Bangun visual produk \u2014 konsep, deskripsi listing, dan ringkasan katalog untuk satu produk.",
        accent: "#6D35FF"
      },
      mula: {
        name: "MULA",
        label: "MLA",
        function: "Launch Campaign Atelier",
        output: "Timeline peluncuran, daftar channel, dan draft pengumuman.",
        rebrand: "Launch Map AI",
        prompt: "Rancang peluncuran \u2014 timeline, channel utama, dan draft pengumuman pertama.",
        accent: "#198CFF"
      },
      arah: {
        name: "ARAH",
        label: "ARH",
        function: "Brand Atlas Studio",
        output: "Ringkasan positioning, target pelanggan, dan rekomendasi arah visual.",
        rebrand: "Brand Compass AI",
        prompt: "Jelaskan bisnis Anda \u2014 dapatkan positioning, target pelanggan, dan arah visual.",
        accent: "#0B2352"
      },
      cetak: {
        name: "CETAK",
        label: "CTK",
        function: "Print Campaign Studio",
        output: "Layout materi cetak, copy iklan, dan ringkasan spesifikasi.",
        rebrand: "Campaign Print Kit AI",
        prompt: "Siapkan materi cetak \u2014 layout, copy iklan, dan spesifikasi dalam satu workspace.",
        accent: "#A0392C"
      },
      adegan: {
        name: "ADEGAN",
        label: "ADG",
        function: "Director's Treatment Lab",
        output: "Draft naskah iklan, shot list, dan ringkasan visual.",
        rebrand: "Video Ad Script Lab",
        prompt: "Tulis treatment iklan \u2014 naskah, shot list, dan ringkasan visual.",
        accent: "#8756FF"
      },
      suara: {
        name: "SUARA",
        label: "SRA",
        function: "Voice Direction Desk",
        output: "Karakter suara brand, panduan tone, dan contoh script.",
        rebrand: "Voice Brand Director AI",
        prompt: "Definisikan suara brand \u2014 karakter, tone, dan contoh script.",
        accent: "#10DCD5"
      },
      bukti: {
        name: "BUKTI",
        label: "BKT",
        function: "Social Proof Ledger",
        output: "Template testimonial, struktur studi kasus, dan ringkasan bukti.",
        rebrand: "Trust Builder AI",
        prompt: "Kumpulkan bukti sosial \u2014 template testimonial, studi kasus, dan ringkasan kepercayaan.",
        accent: "#16866D"
      },
      mimik: {
        name: "MIMIK",
        label: "MMK",
        function: "Persona Continuity Studio",
        output: "Karater persona, bahasa konsisten, dan panduan ekspresi.",
        rebrand: "Brand Voice OS",
        prompt: "Bangun persona brand \u2014 karakter, bahasa konsisten, dan panduan ekspresi.",
        accent: "#6D35FF"
      },
      ritme: {
        name: "RITME",
        label: "RTM",
        function: "Editorial Rhythm Planner",
        output: "Kalender konten, struktur series, dan ringkasan frekuensi.",
        rebrand: "Content Rhythm AI",
        prompt: "Rencanakan ritme konten \u2014 kalender, series, dan frekuensi.",
        accent: "#198CFF"
      },
      tayang: {
        name: "TAYANG",
        label: "TYG",
        function: "Website Blueprint Lab",
        output: "Sitemap, wireframe halaman utama, dan ringkasan alur.",
        rebrand: "Landing Page Blueprint AI",
        prompt: "Rancang website \u2014 sitemap, wireframe halaman utama, dan alur pengunjung.",
        accent: "#126BFF"
      },
      katalog: {
        name: "KATALOG",
        label: "KTL",
        function: "Marketplace Merchandising Board",
        output: "Optimasi listing, struktur etalase, dan ringkasan kategori.",
        rebrand: "Marketplace Growth AI",
        prompt: "Optimalkan katalog \u2014 listing, etalase, dan kategori.",
        accent: "#10DCD5"
      }
    };
    ALL_CATALOG_IDS = Object.keys(APP_CATALOG);
    __name2(packsForApp, "packsForApp");
  }
});
function normalizeLaunchUrl(rawUrl, allowLocalhost = false) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol === "https:") return value;
  if (allowLocalhost && parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    return value;
  }
  return null;
}
__name(normalizeLaunchUrl, "normalizeLaunchUrl");
async function getStoredAppLaunchUrl(db, appId, { allowLocalhost = false } = {}) {
  if (!db || !APP_CATALOG[appId]) return null;
  const row = await db.prepare("SELECT launch_url FROM app_links WHERE app_id = ? LIMIT 1").bind(appId).first();
  const normalized = normalizeLaunchUrl(row?.launch_url, allowLocalhost);
  return normalized || null;
}
__name(getStoredAppLaunchUrl, "getStoredAppLaunchUrl");
async function listAppLinkSettings(db, rawResourceConfig, { allowLocalhost = false } = {}) {
  const storedRows = db ? (await db.prepare("SELECT app_id, launch_url, updated_at FROM app_links ORDER BY app_id").all()).results || [] : [];
  const storedById = new Map(storedRows.map((row) => [row.app_id, row]));
  return ALL_CATALOG_IDS.map((appId) => {
    const meta = APP_CATALOG[appId];
    const stored = storedById.get(appId);
    const storedUrl = normalizeLaunchUrl(stored?.launch_url, allowLocalhost);
    const fallbackUrl = getAppLaunchUrl(appId, rawResourceConfig);
    const launchUrl = storedUrl || fallbackUrl || "";
    const source = storedUrl ? "d1" : fallbackUrl ? "env" : "none";
    return {
      app_id: appId,
      name: meta.name,
      label: meta.label,
      function: meta.function,
      packs: packsForApp(appId),
      launch_url: launchUrl,
      source,
      configured: !!launchUrl,
      updated_at: storedUrl ? stored.updated_at : null
    };
  });
}
__name(listAppLinkSettings, "listAppLinkSettings");
async function saveAppLaunchUrl(db, appId, rawUrl, rawResourceConfig, { allowLocalhost = false } = {}) {
  if (!APP_CATALOG[appId]) {
    return { ok: false, status: 422, error: "invalid_app", message: "Aplikasi tidak dikenal." };
  }
  if (!db) {
    return { ok: false, status: 503, error: "storage_unavailable", message: "D1 database tidak tersedia." };
  }
  const normalizedUrl = normalizeLaunchUrl(rawUrl, allowLocalhost);
  if (normalizedUrl === null) {
    return { ok: false, status: 422, error: "invalid_url", message: "URL harus memakai https://." };
  }
  await db.prepare("DELETE FROM app_links WHERE app_id = ?").bind(appId).run();
  if (normalizedUrl) {
    await db.prepare("INSERT INTO app_links (app_id, launch_url, updated_at) VALUES (?, ?, ?)").bind(appId, normalizedUrl, (/* @__PURE__ */ new Date()).toISOString()).run();
  }
  const apps = await listAppLinkSettings(db, rawResourceConfig, { allowLocalhost });
  return { ok: true, app: apps.find((app) => app.app_id === appId) };
}
__name(saveAppLaunchUrl, "saveAppLaunchUrl");
var init_app_links = __esm({
  "lib/app-links.js"() {
    init_functionsRoutes_0_785663823963553();
    init_access_resources();
    init_catalog();
    __name2(normalizeLaunchUrl, "normalizeLaunchUrl");
    __name2(getStoredAppLaunchUrl, "getStoredAppLaunchUrl");
    __name2(listAppLinkSettings, "listAppLinkSettings");
    __name2(saveAppLaunchUrl, "saveAppLaunchUrl");
  }
});
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json, "json");
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders, "corsHeaders");
function authorize(request, env) {
  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, response: json({ error: "admin_not_configured", message: "Admin panel belum dikonfigurasi." }, 503) };
  }
  const authHeader = request.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (bearerToken !== adminToken) {
    return { ok: false, response: json({ error: "unauthorized", message: "Token admin tidak valid." }, 401) };
  }
  return { ok: true };
}
__name(authorize, "authorize");
async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!["GET", "PUT"].includes(request.method)) return json({ error: "method_not_allowed" }, 405, cors);
  const auth = authorize(request, env);
  if (!auth.ok) {
    const body = await auth.response.json();
    return json(body, auth.response.status, cors);
  }
  if (!env.APPVIBE_DB) {
    return json({ error: "storage_unavailable", message: "D1 database tidak tersedia." }, 503, cors);
  }
  try {
    const isDev = env.ENVIRONMENT === "development";
    const opts = { allowLocalhost: isDev };
    if (request.method === "GET") {
      const apps = await listAppLinkSettings(env.APPVIBE_DB, env.ACCESS_RESOURCE_URLS_JSON, opts);
      return json({ total: apps.length, apps }, 200, cors);
    }
    const payload = await request.json().catch(() => ({}));
    const result = await saveAppLaunchUrl(
      env.APPVIBE_DB,
      payload.app_id,
      payload.launch_url,
      env.ACCESS_RESOURCE_URLS_JSON,
      opts
    );
    if (!result.ok) {
      return json({ error: result.error, message: result.message }, result.status, cors);
    }
    return json({ app: result.app }, 200, cors);
  } catch (err) {
    console.error("[Admin] app links error:", err);
    return json({ error: "app_links_failed", message: "Gagal menyimpan pengaturan aplikasi." }, 500, cors);
  }
}
__name(onRequest, "onRequest");
var init_app_links2 = __esm({
  "api/admin/app-links.js"() {
    init_functionsRoutes_0_785663823963553();
    init_app_links();
    __name2(json, "json");
    __name2(corsHeaders, "corsHeaders");
    __name2(authorize, "authorize");
    __name2(onRequest, "onRequest");
  }
});
function createMemberAccessRepo(db) {
  function prepare(sql) {
    return db.prepare(sql);
  }
  __name(prepare, "prepare");
  __name2(prepare, "prepare");
  async function findOrCreateMember({ name, email, phone_e164 }) {
    const existing = await db.prepare("SELECT * FROM members WHERE phone_e164 = ?").bind(phone_e164).first();
    if (existing) return existing;
    const id = crypto.randomUUID();
    const ts = now();
    await db.prepare(
      `INSERT INTO members (id, name, email_normalized, phone_e164, status, entitlement_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`
    ).bind(id, name, email ? String(email).toLowerCase() : null, phone_e164, ts, ts).run();
    return { id, name, email_normalized: email ? String(email).toLowerCase() : null, phone_e164, status: "pending", entitlement_version: 0, current_access: null, first_paid_at: null, last_paid_at: null, created_at: ts, updated_at: ts };
  }
  __name(findOrCreateMember, "findOrCreateMember");
  __name2(findOrCreateMember, "findOrCreateMember");
  async function getMemberByPhone(phone_e164) {
    return db.prepare("SELECT * FROM members WHERE phone_e164 = ?").bind(phone_e164).first();
  }
  __name(getMemberByPhone, "getMemberByPhone");
  __name2(getMemberByPhone, "getMemberByPhone");
  async function getMemberById(id) {
    return db.prepare("SELECT * FROM members WHERE id = ?").bind(id).first();
  }
  __name(getMemberById, "getMemberById");
  __name2(getMemberById, "getMemberById");
  async function getMemberByIdWithEntitlements(id) {
    const member = await getMemberById(id);
    if (!member) return null;
    const { results: entitlements } = await db.prepare("SELECT * FROM entitlements WHERE member_id = ?").bind(id).all();
    return { ...member, entitlements };
  }
  __name(getMemberByIdWithEntitlements, "getMemberByIdWithEntitlements");
  __name2(getMemberByIdWithEntitlements, "getMemberByIdWithEntitlements");
  async function createOrder({
    id,
    member_id,
    paycore_order_id,
    external_order_id,
    pack_id,
    product_key,
    purchase_type,
    amount,
    currency,
    created_at,
    lp_variant,
    lp_plan,
    lp_pack,
    tracking_meta
  }) {
    const ts = created_at || now();
    await db.prepare(
      `INSERT INTO orders (id, member_id, paycore_order_id, external_order_id, pack_id, product_key, purchase_type, amount, currency, payment_status, fulfillment_status, lp_variant, lp_plan, lp_pack, tracking_meta, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?)`
    ).bind(id, member_id, paycore_order_id, external_order_id || null, pack_id, product_key, purchase_type, amount, currency, lp_variant || null, lp_plan || null, lp_pack || null, tracking_meta || null, ts, ts).run();
    return { id, member_id, paycore_order_id, external_order_id, pack_id, product_key, purchase_type, amount, currency, payment_status: "pending", fulfillment_status: "pending", lp_variant, lp_plan, lp_pack, tracking_meta, created_at: ts, updated_at: ts };
  }
  __name(createOrder, "createOrder");
  __name2(createOrder, "createOrder");
  async function getOrderByPaycoreId(paycore_order_id) {
    return db.prepare("SELECT * FROM orders WHERE paycore_order_id = ?").bind(paycore_order_id).first();
  }
  __name(getOrderByPaycoreId, "getOrderByPaycoreId");
  __name2(getOrderByPaycoreId, "getOrderByPaycoreId");
  async function updateOrderPaymentStatus({ paycore_order_id, payment_status }) {
    const allowed = /* @__PURE__ */ new Set(["pending", "paid", "failed", "expired", "created"]);
    if (!allowed.has(payment_status)) return null;
    const ts = now();
    await db.prepare("UPDATE orders SET payment_status = ?, updated_at = ? WHERE paycore_order_id = ?").bind(payment_status, ts, paycore_order_id).run();
    return getOrderByPaycoreId(paycore_order_id);
  }
  __name(updateOrderPaymentStatus, "updateOrderPaymentStatus");
  __name2(updateOrderPaymentStatus, "updateOrderPaymentStatus");
  async function listOrdersByMember(member_id) {
    const { results } = await db.prepare("SELECT * FROM orders WHERE member_id = ? ORDER BY created_at DESC").bind(member_id).all();
    return results;
  }
  __name(listOrdersByMember, "listOrdersByMember");
  __name2(listOrdersByMember, "listOrdersByMember");
  async function isEventSeen(event_id) {
    const row = await db.prepare("SELECT event_id FROM payment_events WHERE event_id = ?").bind(event_id).first();
    return !!row;
  }
  __name(isEventSeen, "isEventSeen");
  __name2(isEventSeen, "isEventSeen");
  async function markEventSeen({ event_id, event_type, paycore_order_id, status }) {
    const ts = now();
    await db.prepare(
      `INSERT INTO payment_events (event_id, event_type, paycore_order_id, processed_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(event_id, event_type, paycore_order_id, ts, status, ts).run();
  }
  __name(markEventSeen, "markEventSeen");
  __name2(markEventSeen, "markEventSeen");
  async function fulfillOrder({ paycore_order_id, paid_at, fulfilled_at }) {
    const order = await getOrderByPaycoreId(paycore_order_id);
    if (!order) throw new Error(`order_not_found:${paycore_order_id}`);
    if (order.fulfillment_status === "delivered") return order;
    const ts = now();
    const paidTs = paid_at || ts;
    const fulfilledTs = fulfilled_at || ts;
    const pack = PACKS[order.pack_id];
    const ent = entitlementForPack(order.pack_id);
    const statements = [
      db.prepare(
        `UPDATE orders SET payment_status = 'paid', fulfillment_status = 'delivered', paid_at = ?, fulfilled_at = ?, updated_at = ?
           WHERE paycore_order_id = ?`
      ).bind(paidTs, fulfilledTs, ts, paycore_order_id)
    ];
    const existingEnt = await db.prepare(
      `SELECT id FROM entitlements WHERE member_id = ? AND resource_type = ? AND resource_id = ? AND status = 'active'`
    ).bind(order.member_id, ent.resource_type, ent.resource_id).first();
    if (!existingEnt) {
      const entId = crypto.randomUUID();
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO entitlements (id, member_id, resource_type, resource_id, status, source_order_id, granted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
        ).bind(entId, order.member_id, ent.resource_type, ent.resource_id, order.id, fulfilledTs, ts, ts)
      );
    }
    const member = await getMemberById(order.member_id);
    const newEntitlementVersion = (member?.entitlement_version || 0) + (existingEnt ? 0 : 1);
    const firstPaid = member?.first_paid_at || paidTs;
    const accessLabel = pack?.resourceType === "vault" ? "Full Vault" : pack?.description || order.pack_id;
    statements.push(
      db.prepare(
        `UPDATE members
           SET status = 'active',
               entitlement_version = ?,
               current_access = ?,
               first_paid_at = ?,
               last_paid_at = ?,
               updated_at = ?
         WHERE id = ?`
      ).bind(newEntitlementVersion, accessLabel, firstPaid, paidTs, ts, order.member_id)
    );
    statements.push(
      db.prepare(
        `INSERT INTO audit_logs (member_id, order_id, event_type, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        order.member_id,
        order.id,
        "entitlement_granted",
        JSON.stringify({ pack_id: order.pack_id, resource_type: ent.resource_type, resource_id: ent.resource_id }),
        ts
      )
    );
    await db.batch(statements);
    return { ...order, payment_status: "paid", fulfillment_status: "delivered", paid_at: paidTs, fulfilled_at: fulfilledTs };
  }
  __name(fulfillOrder, "fulfillOrder");
  __name2(fulfillOrder, "fulfillOrder");
  async function getActiveEntitlements(member_id) {
    const { results } = await db.prepare("SELECT * FROM entitlements WHERE member_id = ? AND status = 'active'").bind(member_id).all();
    return results;
  }
  __name(getActiveEntitlements, "getActiveEntitlements");
  __name2(getActiveEntitlements, "getActiveEntitlements");
  async function createMagicLink({ id, member_id, token_hash, purpose, expires_at, requested_phone_hash, requested_ip_hash }) {
    const ts = now();
    await db.prepare(
      `INSERT INTO magic_links (id, member_id, token_hash, purpose, expires_at, used_at, requested_phone_hash, requested_ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`
    ).bind(id, member_id, token_hash, purpose || "login", expires_at, requested_phone_hash || null, requested_ip_hash || null, ts).run();
    return { id, member_id, token_hash, purpose: purpose || "login", expires_at, used_at: null, requested_phone_hash, requested_ip_hash, created_at: ts };
  }
  __name(createMagicLink, "createMagicLink");
  __name2(createMagicLink, "createMagicLink");
  async function getMagicLinkByHash(token_hash) {
    return db.prepare("SELECT * FROM magic_links WHERE token_hash = ?").bind(token_hash).first();
  }
  __name(getMagicLinkByHash, "getMagicLinkByHash");
  __name2(getMagicLinkByHash, "getMagicLinkByHash");
  async function consumeMagicLink(id) {
    const ts = now();
    await db.prepare("UPDATE magic_links SET used_at = ? WHERE id = ? AND used_at IS NULL").bind(ts, id).run();
  }
  __name(consumeMagicLink, "consumeMagicLink");
  __name2(consumeMagicLink, "consumeMagicLink");
  async function invalidateMagicLink(id) {
    const ts = now();
    await db.prepare("UPDATE magic_links SET used_at = ? WHERE id = ? AND used_at IS NULL").bind(ts, id).run();
  }
  __name(invalidateMagicLink, "invalidateMagicLink");
  __name2(invalidateMagicLink, "invalidateMagicLink");
  async function listMagicLinksByMember(member_id) {
    const { results } = await db.prepare("SELECT * FROM magic_links WHERE member_id = ? ORDER BY created_at DESC").bind(member_id).all();
    return results;
  }
  __name(listMagicLinksByMember, "listMagicLinksByMember");
  __name2(listMagicLinksByMember, "listMagicLinksByMember");
  async function createSession({ id, member_id, token_hash, expires_at }) {
    const ts = now();
    await db.prepare(
      `INSERT INTO sessions (id, member_id, token_hash, expires_at, revoked_at, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?)`
    ).bind(id, member_id, token_hash, expires_at, ts).run();
    return { id, member_id, token_hash, expires_at, revoked_at: null, last_seen_at: null, created_at: ts };
  }
  __name(createSession, "createSession");
  __name2(createSession, "createSession");
  async function getSessionByHash(token_hash) {
    return db.prepare("SELECT * FROM sessions WHERE token_hash = ?").bind(token_hash).first();
  }
  __name(getSessionByHash, "getSessionByHash");
  __name2(getSessionByHash, "getSessionByHash");
  async function revokeSession(id) {
    const ts = now();
    await db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(ts, id).run();
  }
  __name(revokeSession, "revokeSession");
  __name2(revokeSession, "revokeSession");
  async function touchSession(id, ts) {
    await db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(ts, id).run();
  }
  __name(touchSession, "touchSession");
  __name2(touchSession, "touchSession");
  async function insertAuditLog({ member_id, order_id, event_type, metadata_json }) {
    const ts = now();
    await db.prepare(
      `INSERT INTO audit_logs (member_id, order_id, event_type, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(member_id || null, order_id || null, event_type, metadata_json || null, ts).run();
  }
  __name(insertAuditLog, "insertAuditLog");
  __name2(insertAuditLog, "insertAuditLog");
  async function listAuditLogs(member_id) {
    const { results } = await db.prepare("SELECT * FROM audit_logs WHERE member_id = ? ORDER BY created_at DESC").bind(member_id).all();
    return results;
  }
  __name(listAuditLogs, "listAuditLogs");
  __name2(listAuditLogs, "listAuditLogs");
  async function recordRateLimit(key_hash, kind) {
    const ts = now();
    await db.prepare("INSERT INTO rate_limits (key_hash, kind, created_at) VALUES (?, ?, ?)").bind(key_hash, kind, ts).run();
  }
  __name(recordRateLimit, "recordRateLimit");
  __name2(recordRateLimit, "recordRateLimit");
  async function countRateLimit(key_hash, sinceIso) {
    const row = await db.prepare("SELECT COUNT(*) AS n FROM rate_limits WHERE key_hash = ? AND created_at >= ?").bind(key_hash, sinceIso).first();
    return row?.n || 0;
  }
  __name(countRateLimit, "countRateLimit");
  __name2(countRateLimit, "countRateLimit");
  return {
    findOrCreateMember,
    getMemberByPhone,
    getMemberById,
    getMemberByIdWithEntitlements,
    createOrder,
    getOrderByPaycoreId,
    updateOrderPaymentStatus,
    listOrdersByMember,
    isEventSeen,
    markEventSeen,
    fulfillOrder,
    getActiveEntitlements,
    listMagicLinksByMember,
    createMagicLink,
    getMagicLinkByHash,
    consumeMagicLink,
    invalidateMagicLink,
    createSession,
    getSessionByHash,
    revokeSession,
    touchSession,
    insertAuditLog,
    listAuditLogs,
    recordRateLimit,
    countRateLimit,
    purchaseTypeForPack
  };
}
__name(createMemberAccessRepo, "createMemberAccessRepo");
var now;
var init_db = __esm({
  "lib/db.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    now = /* @__PURE__ */ __name2(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
    __name2(createMemberAccessRepo, "createMemberAccessRepo");
  }
});
function json2(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json2, "json2");
function corsHeaders2(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders2, "corsHeaders2");
async function onRequest2(context) {
  const { request, env } = context;
  const cors = corsHeaders2(request);
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "GET") return json2({ error: "method_not_allowed" }, 405, cors);
  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken) {
    return json2({ error: "admin_not_configured", message: "Admin panel belum dikonfigurasi." }, 503, cors);
  }
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";
  const authHeader = request.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (queryToken !== adminToken && bearerToken !== adminToken) {
    return json2({ error: "unauthorized", message: "Token admin tidak valid." }, 401, cors);
  }
  if (!env.APPVIBE_DB) {
    return json2({ error: "storage_unavailable", message: "D1 database tidak tersedia." }, 503, cors);
  }
  try {
    const repo = createMemberAccessRepo(env.APPVIBE_DB);
    const { results: orderRows } = await env.APPVIBE_DB.prepare(
      `SELECT o.*, m.name AS member_name, m.email_normalized, m.phone_e164
         FROM orders o
         JOIN members m ON m.id = o.member_id
         ORDER BY o.created_at DESC`
    ).all();
    const orders = (orderRows || []).map((row) => {
      const pack = PACKS[row.pack_id];
      return {
        order_id: row.paycore_order_id || "",
        external_order_id: row.external_order_id || "",
        pack_id: row.pack_id,
        pack_name: pack?.description || row.product_key || row.pack_id,
        amount: row.amount,
        currency: row.currency,
        buyer_name: row.member_name || "",
        buyer_email: row.email_normalized || "",
        payment_status: row.payment_status || "unknown",
        fulfillment_status: row.fulfillment_status || "unknown",
        created_at: row.created_at,
        updated_at: row.updated_at,
        fulfilled_at: row.fulfilled_at,
        paid_at: row.paid_at
      };
    });
    return json2({ total: orders.length, orders }, 200, cors);
  } catch (err) {
    console.error("[Admin] list orders error:", err);
    return json2({ error: "list_failed", message: "Gagal mengambil daftar order." }, 500, cors);
  }
}
__name(onRequest2, "onRequest2");
var init_orders = __esm({
  "api/admin/orders.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    init_db();
    __name2(json2, "json");
    __name2(corsHeaders2, "corsHeaders");
    __name2(onRequest2, "onRequest");
  }
});
var paycore_sign_exports = {};
__export(paycore_sign_exports, {
  hmacSha256Hex: /* @__PURE__ */ __name(() => hmacSha256Hex, "hmacSha256Hex"),
  sha256Hex: /* @__PURE__ */ __name(() => sha256Hex, "sha256Hex"),
  signPayCoreRequest: /* @__PURE__ */ __name(() => signPayCoreRequest, "signPayCoreRequest")
});
async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256Hex, "hmacSha256Hex");
async function signPayCoreRequest({ appSecret, timestamp, method, path, rawBody }) {
  const bodyHash = await sha256Hex(rawBody);
  const message = `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;
  return hmacSha256Hex(appSecret, message);
}
__name(signPayCoreRequest, "signPayCoreRequest");
var init_paycore_sign = __esm({
  "lib/paycore-sign.js"() {
    init_functionsRoutes_0_785663823963553();
    __name2(sha256Hex, "sha256Hex");
    __name2(hmacSha256Hex, "hmacSha256Hex");
    __name2(signPayCoreRequest, "signPayCoreRequest");
  }
});
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}
__name(generateToken, "generateToken");
function base64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64Url, "base64Url");
async function hashToken(token, pepper) {
  return hmacSha256Hex(pepper, token);
}
__name(hashToken, "hashToken");
async function hashIdentifier(identifier, pepper) {
  return hmacSha256Hex(pepper, String(identifier ?? ""));
}
__name(hashIdentifier, "hashIdentifier");
var SESSION_MAX_AGE_SECONDS;
var MAGIC_LINK_MAX_AGE_SECONDS;
var init_auth_crypto = __esm({
  "lib/auth-crypto.js"() {
    init_functionsRoutes_0_785663823963553();
    init_paycore_sign();
    SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
    MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60;
    __name2(generateToken, "generateToken");
    __name2(base64Url, "base64Url");
    __name2(hashToken, "hashToken");
    __name2(hashIdentifier, "hashIdentifier");
  }
});
function json3(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json3, "json3");
async function onRequest3(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json3({ error: "method_not_allowed" }, 405);
  if (!env.APPVIBE_DB || !env.AUTH_TOKEN_PEPPER) {
    return json3({ error: "server_misconfigured" }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json3({ error: "invalid_json" }, 400);
  }
  const rawToken = String(body?.token || "").trim();
  if (!rawToken) return json3({ error: "missing_token" }, 400);
  const pepper = env.AUTH_TOKEN_PEPPER;
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const tokenHash = await hashToken(rawToken, pepper);
  const link = await repo.getMagicLinkByHash(tokenHash);
  if (!link) {
    return json3({ error: "invalid_token", message: "Tautan tidak valid." }, 401);
  }
  if (link.used_at) {
    return json3({ error: "token_used", message: "Tautan sudah digunakan." }, 401);
  }
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return json3({ error: "token_expired", message: "Tautan sudah kedaluwarsa." }, 401);
  }
  await repo.consumeMagicLink(link.id);
  const member = await repo.getMemberById(link.member_id);
  if (!member) {
    return json3({ error: "member_not_found" }, 404);
  }
  const sessionToken = generateToken();
  const sessionHash = await hashToken(sessionToken, pepper);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1e3).toISOString();
  await repo.createSession({
    id: sessionId,
    member_id: member.id,
    token_hash: sessionHash,
    expires_at: expiresAt
  });
  await repo.insertAuditLog({
    member_id: member.id,
    event_type: "login_succeeded",
    metadata_json: JSON.stringify({ magic_link_id: link.id })
  });
  const cookie = [
    `av_session=${sessionToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ].join("; ");
  return json3(
    { ok: true, member_name: member.name },
    200,
    { "Set-Cookie": cookie }
  );
}
__name(onRequest3, "onRequest3");
var init_consume_magic_link = __esm({
  "api/auth/consume-magic-link.js"() {
    init_functionsRoutes_0_785663823963553();
    init_auth_crypto();
    init_db();
    __name2(json3, "json");
    __name2(onRequest3, "onRequest");
  }
});
function json4(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json4, "json4");
function parseSessionCookie(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match2 = cookie.match(/(?:^|;\s*)av_session=([^;]+)/);
  return match2 ? match2[1] : null;
}
__name(parseSessionCookie, "parseSessionCookie");
async function onRequest4(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json4({ error: "method_not_allowed" }, 405);
  const clearCookie = "av_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
  if (!env.APPVIBE_DB || !env.AUTH_TOKEN_PEPPER) {
    return json4({ ok: true }, 200, { "Set-Cookie": clearCookie });
  }
  const rawToken = parseSessionCookie(request);
  if (!rawToken) {
    return json4({ ok: true }, 200, { "Set-Cookie": clearCookie });
  }
  const pepper = env.AUTH_TOKEN_PEPPER;
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const tokenHash = await hashToken(rawToken, pepper);
  const session = await repo.getSessionByHash(tokenHash);
  if (session && !session.revoked_at) {
    await repo.revokeSession(session.id);
    await repo.insertAuditLog({
      member_id: session.member_id,
      event_type: "logout",
      metadata_json: JSON.stringify({ session_id: session.id })
    });
  }
  return json4({ ok: true }, 200, { "Set-Cookie": clearCookie });
}
__name(onRequest4, "onRequest4");
var init_logout = __esm({
  "api/auth/logout.js"() {
    init_functionsRoutes_0_785663823963553();
    init_auth_crypto();
    init_db();
    __name2(json4, "json");
    __name2(parseSessionCookie, "parseSessionCookie");
    __name2(onRequest4, "onRequest");
  }
});
function clean(input) {
  return String(input ?? "").replace(/[\s\-().]/g, "");
}
__name(clean, "clean");
function extractNational(cleaned) {
  let digits = cleaned;
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^[0-9]+$/.test(digits)) {
    throw new InvalidPhoneError("Phone contains non-numeric characters");
  }
  let national;
  if (digits.startsWith("62")) {
    national = digits.slice(2);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.startsWith("8")) {
    national = digits;
  } else {
    throw new InvalidPhoneError("Not an Indonesian number");
  }
  if (!national.startsWith("8")) {
    throw new InvalidPhoneError("Indonesian mobile numbers must start with 8");
  }
  if (national.length < MIN_NSN || national.length > MAX_NSN) {
    throw new InvalidPhoneError(`Invalid length (${national.length} digits)`);
  }
  return national;
}
__name(extractNational, "extractNational");
function normalizePhone(input) {
  const cleaned = clean(input);
  if (!cleaned) throw new InvalidPhoneError("Phone is required");
  const national = extractNational(cleaned);
  return `+62${national}`;
}
__name(normalizePhone, "normalizePhone");
function toFonnteTarget(phoneE164) {
  return String(phoneE164).replace(/^\+/, "");
}
__name(toFonnteTarget, "toFonnteTarget");
var MIN_NSN;
var MAX_NSN;
var InvalidPhoneError;
var init_phone = __esm({
  "lib/phone.js"() {
    init_functionsRoutes_0_785663823963553();
    MIN_NSN = 9;
    MAX_NSN = 12;
    __name2(clean, "clean");
    __name2(extractNational, "extractNational");
    InvalidPhoneError = class extends Error {
      static {
        __name(this, "InvalidPhoneError");
      }
      static {
        __name2(this, "InvalidPhoneError");
      }
      constructor(message) {
        super(message);
        this.name = "InvalidPhoneError";
      }
    };
    __name2(normalizePhone, "normalizePhone");
    __name2(toFonnteTarget, "toFonnteTarget");
  }
});
function composeMessage(magicLinkUrl) {
  return [
    "AppVibe Vault \u2014 Tautan Akses Anda",
    "",
    "Gunakan tautan berikut untuk masuk ke akun AppVibe Vault Anda. Tautan ini hanya berlaku 15 menit dan dapat digunakan satu kali.",
    "",
    magicLinkUrl,
    "",
    "Jika Anda tidak meminta tautan ini, abaikan pesan ini."
  ].join("\n");
}
__name(composeMessage, "composeMessage");
async function sendMagicLinkWhatsApp({ token, to, magicLinkUrl, fetchImpl = fetch }) {
  if (!token) throw new Error("FONNTE_TOKEN is required");
  const body = JSON.stringify({
    target: toFonnteTarget(to),
    message: composeMessage(magicLinkUrl)
  });
  let res;
  try {
    res = await fetchImpl(FONNTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body
    });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  let data;
  try {
    data = await res.json();
  } catch {
    return false;
  }
  return data?.status === true;
}
__name(sendMagicLinkWhatsApp, "sendMagicLinkWhatsApp");
var FONNTE_ENDPOINT;
var init_fonnte = __esm({
  "lib/fonnte.js"() {
    init_functionsRoutes_0_785663823963553();
    init_phone();
    FONNTE_ENDPOINT = "https://api.fonnte.com/send";
    __name2(composeMessage, "composeMessage");
    __name2(sendMagicLinkWhatsApp, "sendMagicLinkWhatsApp");
  }
});
function iso(ms) {
  return new Date(ms).toISOString();
}
__name(iso, "iso");
async function checkRateLimit(repo, { kind, key, nowMs = Date.now() }) {
  if (kind === "phone") {
    const shortSince = iso(nowMs - PHONE_SHORT_WINDOW_MS);
    const longSince = iso(nowMs - PHONE_LONG_WINDOW_MS);
    const shortCount = await repo.countRateLimit(key, shortSince);
    if (shortCount >= PHONE_SHORT_MAX) return { allowed: false };
    const longCount = await repo.countRateLimit(key, longSince);
    if (longCount >= PHONE_LONG_MAX) return { allowed: false };
    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }
  if (kind === "checkout_phone") {
    const shortSince = iso(nowMs - CHECKOUT_PHONE_SHORT_WINDOW_MS);
    const longSince = iso(nowMs - CHECKOUT_PHONE_LONG_WINDOW_MS);
    const shortCount = await repo.countRateLimit(key, shortSince);
    if (shortCount >= CHECKOUT_PHONE_SHORT_MAX) return { allowed: false };
    const longCount = await repo.countRateLimit(key, longSince);
    if (longCount >= CHECKOUT_PHONE_LONG_MAX) return { allowed: false };
    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }
  if (kind === "ip") {
    const since = iso(nowMs - IP_WINDOW_MS);
    const count = await repo.countRateLimit(key, since);
    if (count >= IP_MAX) return { allowed: false };
    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }
  if (kind === "checkout_ip") {
    const since = iso(nowMs - CHECKOUT_IP_WINDOW_MS);
    const count = await repo.countRateLimit(key, since);
    if (count >= CHECKOUT_IP_MAX) return { allowed: false };
    await repo.recordRateLimit(key, kind);
    return { allowed: true };
  }
  return { allowed: false };
}
__name(checkRateLimit, "checkRateLimit");
var PHONE_SHORT_WINDOW_MS;
var PHONE_SHORT_MAX;
var PHONE_LONG_WINDOW_MS;
var PHONE_LONG_MAX;
var IP_WINDOW_MS;
var IP_MAX;
var CHECKOUT_PHONE_SHORT_WINDOW_MS;
var CHECKOUT_PHONE_SHORT_MAX;
var CHECKOUT_PHONE_LONG_WINDOW_MS;
var CHECKOUT_PHONE_LONG_MAX;
var CHECKOUT_IP_WINDOW_MS;
var CHECKOUT_IP_MAX;
var init_rate_limit = __esm({
  "lib/rate-limit.js"() {
    init_functionsRoutes_0_785663823963553();
    PHONE_SHORT_WINDOW_MS = 6e4;
    PHONE_SHORT_MAX = 1;
    PHONE_LONG_WINDOW_MS = 15 * 6e4;
    PHONE_LONG_MAX = 3;
    IP_WINDOW_MS = 15 * 6e4;
    IP_MAX = 10;
    CHECKOUT_PHONE_SHORT_WINDOW_MS = 6e4;
    CHECKOUT_PHONE_SHORT_MAX = 1;
    CHECKOUT_PHONE_LONG_WINDOW_MS = 15 * 6e4;
    CHECKOUT_PHONE_LONG_MAX = 4;
    CHECKOUT_IP_WINDOW_MS = 15 * 6e4;
    CHECKOUT_IP_MAX = 20;
    __name2(iso, "iso");
    __name2(checkRateLimit, "checkRateLimit");
  }
});
function activeEntitlements(rows) {
  const set = /* @__PURE__ */ new Set();
  for (const r of rows || []) {
    if (r?.status !== "active") continue;
    set.add(`${r.resource_type}:${r.resource_id}`);
  }
  return VALID_PACK_IDS.map((packId) => {
    const e = entitlementForPack(packId);
    return set.has(`${e.resource_type}:${e.resource_id}`) ? e : null;
  }).filter(Boolean);
}
__name(activeEntitlements, "activeEntitlements");
function computeUnlockedAppIds(rows) {
  if (isFullVault(rows)) return [...ALL_APP_IDS];
  const unlocked = /* @__PURE__ */ new Set();
  for (const e of activeEntitlements(rows)) {
    const pack = PACKS[e.resource_id];
    if (pack?.appIds) {
      for (const id of pack.appIds) unlocked.add(id);
    }
  }
  return ALL_APP_IDS.filter((id) => unlocked.has(id));
}
__name(computeUnlockedAppIds, "computeUnlockedAppIds");
function isFullVault(rows) {
  return (rows || []).some(
    (r) => r?.status === "active" && r.resource_type === "vault" && r.resource_id === "vault_full"
  );
}
__name(isFullVault, "isFullVault");
function summarizeAccess(rows) {
  const hasFullVault = isFullVault(rows);
  const bundleIds = activeEntitlements(rows).filter((e) => e.resource_type === "bundle").map((e) => e.resource_id);
  return {
    hasFullVault,
    bundleIds,
    appIds: computeUnlockedAppIds(rows)
  };
}
__name(summarizeAccess, "summarizeAccess");
var init_entitlements = __esm({
  "lib/entitlements.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    __name2(activeEntitlements, "activeEntitlements");
    __name2(computeUnlockedAppIds, "computeUnlockedAppIds");
    __name2(isFullVault, "isFullVault");
    __name2(summarizeAccess, "summarizeAccess");
  }
});
function json5(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(json5, "json5");
function corsHeaders3(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : APP_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders3, "corsHeaders3");
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
}
__name(clientIp, "clientIp");
async function onRequest5(context) {
  const { request, env } = context;
  const cors = corsHeaders3(request);
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json5({ error: "method_not_allowed" }, 405, cors);
  if (!env.APPVIBE_DB) {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const fonnteToken = env.FONNTE_TOKEN;
  const baseUrl = env.APP_BASE_URL || "https://appvibe.biz.id";
  const pepper = env.AUTH_TOKEN_PEPPER;
  if (!fonnteToken || !pepper) {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const phoneInput = String(body?.phone || "").trim();
  let phoneE164;
  try {
    phoneE164 = normalizePhone(phoneInput);
  } catch {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  const nowMs = Date.now();
  const phoneKey = await hashIdentifier(phoneE164, pepper);
  const ipKey = await hashIdentifier(clientIp(request), pepper);
  const phoneLimit = await checkRateLimit(repo, { kind: "phone", key: phoneKey, nowMs });
  if (!phoneLimit.allowed) {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const ipLimit = await checkRateLimit(repo, { kind: "ip", key: ipKey, nowMs });
  if (!ipLimit.allowed) {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const member = await repo.getMemberByPhone(phoneE164);
  if (!member) {
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const entitlements = await repo.getActiveEntitlements(member.id);
  if (!entitlements || entitlements.length === 0) {
    await repo.insertAuditLog({
      member_id: member.id,
      event_type: "magic_link_failed",
      metadata_json: JSON.stringify({ reason: "no_active_entitlement" })
    });
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken, pepper);
  const linkId = crypto.randomUUID();
  const expiresAt = new Date(nowMs + MAGIC_LINK_MAX_AGE_SECONDS * 1e3).toISOString();
  const phoneHash = await hashIdentifier(phoneE164, pepper);
  const ipHashVal = await hashIdentifier(clientIp(request), pepper);
  await repo.createMagicLink({
    id: linkId,
    member_id: member.id,
    token_hash: tokenHash,
    purpose: "login",
    expires_at: expiresAt,
    requested_phone_hash: phoneHash,
    requested_ip_hash: ipHashVal
  });
  await repo.insertAuditLog({
    member_id: member.id,
    event_type: "magic_link_requested",
    metadata_json: JSON.stringify({ link_id: linkId })
  });
  const magicLinkUrl = `${baseUrl.replace(/\/+$/, "")}/access/verify?token=${rawToken}`;
  const sent = await sendMagicLinkWhatsApp({
    token: fonnteToken,
    to: member.phone_e164,
    magicLinkUrl,
    fetchImpl: env._fetchImpl || fetch
  });
  if (!sent) {
    await repo.invalidateMagicLink(linkId);
    await repo.insertAuditLog({
      member_id: member.id,
      event_type: "magic_link_failed",
      metadata_json: JSON.stringify({ reason: "fonnte_send_failed", link_id: linkId })
    });
    return json5({ message: GENERIC_MSG }, 200, cors);
  }
  await repo.insertAuditLog({
    member_id: member.id,
    event_type: "magic_link_sent",
    metadata_json: JSON.stringify({ link_id: linkId })
  });
  return json5({ message: GENERIC_MSG }, 200, cors);
}
__name(onRequest5, "onRequest5");
var APP_ORIGIN;
var GENERIC_MSG;
var init_request_magic_link = __esm({
  "api/auth/request-magic-link.js"() {
    init_functionsRoutes_0_785663823963553();
    init_phone();
    init_auth_crypto();
    init_db();
    init_fonnte();
    init_rate_limit();
    init_entitlements();
    APP_ORIGIN = "https://appvibe.biz.id";
    GENERIC_MSG = "Jika nomor terdaftar, tautan akses telah dikirim melalui WhatsApp.";
    __name2(json5, "json");
    __name2(corsHeaders3, "corsHeaders");
    __name2(clientIp, "clientIp");
    __name2(onRequest5, "onRequest");
  }
});
function clientIp2(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
}
__name(clientIp2, "clientIp2");
async function verifyTurnstile({ secret, token, remoteip, fetchImpl = fetch }) {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: "missing_token" };
  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);
  if (remoteip) formData.set("remoteip", remoteip);
  const response = await fetchImpl(VERIFY_URL, {
    method: "POST",
    body: formData
  });
  if (!response.ok) return { ok: false, error: "verify_http_error" };
  const data = await response.json().catch(() => ({}));
  return {
    ok: data.success === true,
    error: data.success === true ? null : "verification_failed",
    codes: Array.isArray(data["error-codes"]) ? data["error-codes"] : []
  };
}
__name(verifyTurnstile, "verifyTurnstile");
var VERIFY_URL;
var init_turnstile = __esm({
  "lib/turnstile.js"() {
    init_functionsRoutes_0_785663823963553();
    VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    __name2(clientIp2, "clientIp");
    __name2(verifyTurnstile, "verifyTurnstile");
  }
});
function json6(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(json6, "json6");
function corsHeaders4(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === APP_ORIGIN2;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : APP_ORIGIN2,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders4, "corsHeaders4");
function pickMeta(body, key) {
  return typeof body?.[key] === "string" ? body[key].trim() : "";
}
__name(pickMeta, "pickMeta");
async function postJsonFollowingGoogleRedirect(url, payload) {
  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
    body: JSON.stringify(payload)
  });
  if (response.status === 302) {
    const location = response.headers.get("location");
    if (location) {
      response = await fetch(location, { redirect: "follow" });
    }
  }
  if (!response.ok) {
    console.warn("[Checkout] order forwarding returned", response.status);
  }
}
__name(postJsonFollowingGoogleRedirect, "postJsonFollowingGoogleRedirect");
async function scheduleBackground(context, promise, label) {
  const guarded = promise.catch((err) => {
    console.error(label, err);
  });
  if (typeof context.waitUntil === "function") {
    context.waitUntil(guarded);
    return;
  }
  await guarded;
}
__name(scheduleBackground, "scheduleBackground");
async function createPaycoreOrderForPack({
  repo,
  member,
  name,
  email,
  phoneE164,
  packId,
  pack,
  baseUrl,
  appId,
  keyId,
  appSecret,
  returnUrl,
  amountOverride,
  purchaseTypeOverride,
  fulfillmentMeta = {},
  leadMeta = {},
  trackingMeta
}) {
  const externalOrderId = `vault-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const idempotencyKey = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const amount = typeof amountOverride === "number" ? amountOverride : pack.amount;
  const purchaseType = purchaseTypeOverride || purchaseTypeForPack(packId);
  const orderBody = {
    external_order_id: externalOrderId,
    product_key: pack.product_key,
    description: pack.description,
    amount,
    currency: pack.currency,
    customer: {
      name,
      email,
      phone: phoneE164
    },
    return_url: returnUrl,
    fulfillment_data: {
      pack_id: packId,
      product_key: pack.product_key,
      email,
      name,
      phone: phoneE164,
      source: "appvibe.biz.id_checkout",
      ...fulfillmentMeta
    }
  };
  const rawBody = JSON.stringify(orderBody);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const path = "/v1/orders";
  const signatureHex = await signPayCoreRequest({
    appSecret,
    timestamp,
    method: "POST",
    path,
    rawBody
  });
  const paycoreRes = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PayCore-App": appId,
      "X-PayCore-Key-Id": keyId,
      "X-PayCore-Timestamp": timestamp,
      "X-PayCore-Signature": `sha256=${signatureHex}`,
      "Idempotency-Key": idempotencyKey
    },
    body: rawBody
  });
  const paycoreJson = await paycoreRes.json().catch(() => ({}));
  if (!paycoreRes.ok) {
    return {
      ok: false,
      response: json6(
        {
          error: "paycore_error",
          status: paycoreRes.status,
          message: "Gagal membuat order pembayaran. Silakan coba lagi."
        },
        paycoreRes.status >= 500 ? 502 : 400
      )
    };
  }
  if (!paycoreJson.checkout_url) {
    return {
      ok: false,
      response: json6({ error: "no_checkout_url", message: "Tidak ada URL pembayaran dari PayCore." }, 502)
    };
  }
  await repo.createOrder({
    id: orderId,
    member_id: member.id,
    paycore_order_id: paycoreJson.order_id,
    external_order_id: externalOrderId,
    pack_id: packId,
    product_key: pack.product_key,
    purchase_type: purchaseType,
    amount,
    currency: pack.currency,
    lp_variant: leadMeta.lp_variant || void 0,
    lp_plan: leadMeta.lp_plan || void 0,
    lp_pack: leadMeta.lp_pack || void 0,
    tracking_meta: trackingMeta
  });
  return {
    ok: true,
    orderId,
    externalOrderId,
    paycoreJson,
    amount,
    purchaseType
  };
}
__name(createPaycoreOrderForPack, "createPaycoreOrderForPack");
var APP_ORIGIN2;
var init_checkout_order = __esm({
  "lib/checkout-order.js"() {
    init_functionsRoutes_0_785663823963553();
    init_paycore_sign();
    init_packs();
    APP_ORIGIN2 = "https://appvibe.biz.id";
    __name2(json6, "json");
    __name2(corsHeaders4, "corsHeaders");
    __name2(pickMeta, "pickMeta");
    __name2(postJsonFollowingGoogleRedirect, "postJsonFollowingGoogleRedirect");
    __name2(scheduleBackground, "scheduleBackground");
    __name2(createPaycoreOrderForPack, "createPaycoreOrderForPack");
  }
});
var avf_client_exports = {};
__export(avf_client_exports, {
  postEventToFlow: /* @__PURE__ */ __name(() => postEventToFlow, "postEventToFlow")
});
async function postEventToFlow(env, { type, contact, data, metadata = {} }) {
  const url = env.AVF_EVENT_URL;
  const apiKey = env.AVF_API_KEY;
  const hmacSecret = env.AVF_HMAC_SECRET;
  const projectSlug = env.AVF_PROJECT_SLUG || "appvibe-biz-id";
  if (!url || !apiKey || !hmacSecret) return false;
  const eventId = `evt_avb_${crypto.randomUUID()}`;
  const idempotencyKey = `avb_${crypto.randomUUID()}`;
  const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
  const unixSeconds = Math.floor(Date.now() / 1e3);
  const payload = {
    event_id: eventId,
    project_slug: projectSlug,
    type,
    occurred_at: occurredAt,
    contact: {
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      whatsapp_opt_in: contact.whatsapp_opt_in ?? true
    },
    data: {
      ...data,
      product_name: data.product_name || ""
    },
    metadata: {
      source: "appvibe-biz-id",
      schema_version: "2026-07-1",
      ...metadata
    }
  };
  const rawBody = JSON.stringify(payload);
  const signPayload = `${unixSeconds}.${rawBody}`;
  const sigHex = await hmacSha256Hex(hmacSecret, signPayload);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-AVF-Timestamp": String(unixSeconds),
        "X-AVF-Signature": `sha256=${sigHex}`,
        "Idempotency-Key": idempotencyKey
      },
      body: rawBody
    });
    if (!res.ok) {
      console.error("[AVF] Event rejected:", res.status, await res.text().catch(() => ""));
      return false;
    }
    const result = await res.json();
    return result.accepted === true;
  } catch (err) {
    console.error("[AVF] Event send failed:", err.message);
    return false;
  }
}
__name(postEventToFlow, "postEventToFlow");
var init_avf_client = __esm({
  "lib/avf-client.js"() {
    init_functionsRoutes_0_785663823963553();
    init_paycore_sign();
    __name2(postEventToFlow, "postEventToFlow");
  }
});
async function onRequest6(context) {
  const { request, env } = context;
  const cors = corsHeaders4(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (request.method !== "POST") {
    return json6({ error: "method_not_allowed" }, 405, cors);
  }
  const baseUrl = env.PAYCORE_BASE_URL || "https://pay-staging.appvibe.biz.id";
  const appId = env.PAYCORE_APP_ID || "appvibe_vault";
  const keyId = env.PAYCORE_KEY_ID;
  const appSecret = env.PAYCORE_APP_SECRET;
  const returnUrl = env.PAYCORE_RETURN_URL || "https://appvibe.biz.id/checkout/";
  if (!keyId || !appSecret) {
    return json6(
      {
        error: "payments_not_configured",
        message: "Pembayaran belum siap. Pastikan PAYCORE_KEY_ID dan PAYCORE_APP_SECRET sudah diatur di environment Cloudflare Pages."
      },
      503,
      cors
    );
  }
  if (!env.APPVIBE_DB) {
    return json6(
      { error: "storage_unavailable", message: "Database belum dikonfigurasi." },
      503,
      cors
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json6({ error: "invalid_json" }, 400, cors);
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phoneInput = String(body.phone || "").trim();
  const packId = String(body.pack_id || "").trim();
  const turnstileToken = String(body.turnstile_token || "").trim();
  const lpVariant = pickMeta(body, "lp_variant");
  const lpPlan = pickMeta(body, "lp_plan");
  const lpPack = pickMeta(body, "lp_pack");
  const fbp = pickMeta(body, "fbp");
  const fbc = pickMeta(body, "fbc");
  const ipAddress = clientIp2(request);
  const userAgent = request.headers.get("User-Agent") || "";
  const trackingMeta = JSON.stringify({ fbp, fbc, client_ip: ipAddress, user_agent: userAgent });
  if (!packId || !VALID_PACK_IDS.includes(packId)) {
    return json6(
      { error: "invalid_pack", message: "Paket tidak valid. Silakan pilih paket yang tersedia." },
      422,
      cors
    );
  }
  if (!name || name.length < 2) {
    return json6(
      { error: "validation", message: "Nama lengkap wajib diisi (minimal 2 karakter)." },
      422,
      cors
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json6(
      { error: "validation", message: "Email valid wajib diisi." },
      422,
      cors
    );
  }
  let phoneE164;
  try {
    phoneE164 = normalizePhone(phoneInput);
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      return json6(
        { error: "validation", message: "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx." },
        422,
        cors
      );
    }
    throw err;
  }
  try {
    const turnstile = await verifyTurnstile({
      secret: env.TURNSTILE_SECRET_KEY,
      token: turnstileToken,
      remoteip: ipAddress,
      fetchImpl: env._fetchImpl || fetch
    });
    if (!turnstile.ok) {
      return json6(
        { error: "turnstile_failed", message: "Verifikasi keamanan gagal. Silakan muat ulang halaman dan coba lagi." },
        403,
        cors
      );
    }
    const pack = PACKS[packId];
    const repo = createMemberAccessRepo(env.APPVIBE_DB);
    if (env.AUTH_TOKEN_PEPPER) {
      const nowMs = Date.now();
      const phoneKey = await hashIdentifier(`checkout_phone:${phoneE164}`, env.AUTH_TOKEN_PEPPER);
      const ipKey = await hashIdentifier(`checkout_ip:${ipAddress}`, env.AUTH_TOKEN_PEPPER);
      const phoneLimit = await checkRateLimit(repo, { kind: "checkout_phone", key: phoneKey, nowMs });
      const ipLimit = phoneLimit.allowed ? await checkRateLimit(repo, { kind: "checkout_ip", key: ipKey, nowMs }) : { allowed: false };
      if (!phoneLimit.allowed || !ipLimit.allowed) {
        return json6(
          { error: "rate_limited", message: "Terlalu banyak percobaan checkout. Silakan coba lagi beberapa saat lagi." },
          429,
          cors
        );
      }
    }
    const member = await repo.findOrCreateMember({ name, email, phone_e164: phoneE164 });
    const created = await createPaycoreOrderForPack({
      repo,
      member,
      name,
      email,
      phoneE164,
      packId,
      pack,
      baseUrl,
      appId,
      keyId,
      appSecret,
      returnUrl,
      trackingMeta,
      fulfillmentMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack
      },
      leadMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack
      }
    });
    if (!created.ok) {
      const data = await created.response.json();
      return json6(data, created.response.status, cors);
    }
    if (env.LEAD_WEBHOOK_URL) {
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      await scheduleBackground(
        context,
        postJsonFollowingGoogleRedirect(env.LEAD_WEBHOOK_URL, {
          name,
          email,
          whatsapp: phoneE164,
          niche: packId,
          model_penggunaan: "purchase",
          selected_pack: packId,
          selected_app: "",
          form_open_source: "checkout_form",
          utm_source: pickMeta(body, "utm_source"),
          utm_medium: pickMeta(body, "utm_medium"),
          utm_campaign: pickMeta(body, "utm_campaign"),
          utm_content: pickMeta(body, "utm_content"),
          utm_term: pickMeta(body, "utm_term"),
          referrer: pickMeta(body, "referrer"),
          landing_url: pickMeta(body, "landing_url"),
          device_type: pickMeta(body, "device_type"),
          lp_variant: lpVariant,
          lp_plan: lpPlan,
          lp_pack: lpPack,
          fbp,
          fbc,
          captured_at: now2,
          order_id: created.paycoreJson.order_id || "",
          order_status: created.paycoreJson.payment_status || "pending"
        }),
        "[Checkout] order forwarding failed:"
      );
    }
    if (env.AVF_EVENT_URL) {
      await scheduleBackground(
        context,
        (async () => {
          try {
            const { postEventToFlow: postEventToFlow2 } = await Promise.resolve().then(() => (init_avf_client(), avf_client_exports));
            await postEventToFlow2(env, {
              type: "form.submitted",
              contact: {
                name,
                email,
                phone: phoneE164,
                whatsapp_opt_in: true
              },
              data: {
                product_name: String(pack.description || pack.product_key || packId),
                pack_id: packId,
                amount: pack.amount,
                checkout_url: created.paycoreJson.checkout_url || ""
              }
            });
          } catch (e) {
            console.error("[AVF] form.submitted event failed:", e.message);
          }
        })(),
        "[AVF] form.submitted event failed:"
      );
    }
    return json6(
      {
        checkout_url: created.paycoreJson.checkout_url,
        order_id: created.paycoreJson.order_id,
        external_order_id: created.paycoreJson.external_order_id,
        payment_status: created.paycoreJson.payment_status || "pending",
        amount: created.amount
      },
      201,
      cors
    );
  } catch (err) {
    console.error("[Checkout] create-order error:", err);
    return json6(
      {
        error: "create_order_failed",
        message: "Gagal membuat order. Silakan coba lagi nanti."
      },
      502,
      cors
    );
  }
}
__name(onRequest6, "onRequest6");
var init_create_order = __esm({
  "api/checkout/create-order.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    init_phone();
    init_db();
    init_auth_crypto();
    init_rate_limit();
    init_turnstile();
    init_checkout_order();
    __name2(onRequest6, "onRequest");
  }
});
function parseSessionCookie2(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match2 = cookie.match(/(?:^|;\s*)av_session=([^;]+)/);
  return match2 ? match2[1] : null;
}
__name(parseSessionCookie2, "parseSessionCookie2");
async function resolveSession({ request, db, pepper }) {
  if (!db || !pepper) {
    return { ok: false, error: "server_misconfigured", message: "Server belum dikonfigurasi.", status: 500 };
  }
  const rawToken = parseSessionCookie2(request);
  if (!rawToken) {
    return { ok: false, error: "unauthenticated", message: "Silakan masuk terlebih dahulu.", status: 401 };
  }
  const repo = createMemberAccessRepo(db);
  const tokenHash = await hashToken(rawToken, pepper);
  const session = await repo.getSessionByHash(tokenHash);
  if (!session || session.revoked_at) {
    return { ok: false, error: "session_invalid", message: "Sesi tidak valid.", status: 401 };
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "session_expired", message: "Sesi sudah kedaluwarsa.", status: 401 };
  }
  repo.touchSession(session.id, (/* @__PURE__ */ new Date()).toISOString()).catch(() => {
  });
  const member = await repo.getMemberById(session.member_id);
  if (!member) {
    return { ok: false, error: "member_not_found", message: "Member tidak ditemukan.", status: 404 };
  }
  const entitlements = await repo.getActiveEntitlements(member.id);
  return { ok: true, member, entitlements, repo, session };
}
__name(resolveSession, "resolveSession");
var init_session = __esm({
  "lib/session.js"() {
    init_functionsRoutes_0_785663823963553();
    init_auth_crypto();
    init_db();
    __name2(parseSessionCookie2, "parseSessionCookie");
    __name2(resolveSession, "resolveSession");
  }
});
function hasPaidDeliveredBundleOrder(orders = []) {
  return orders.some((order) => QUALIFYING_BUNDLE_IDS.includes(order.pack_id) && order.payment_status === "paid" && order.fulfillment_status === "delivered");
}
__name(hasPaidDeliveredBundleOrder, "hasPaidDeliveredBundleOrder");
function isEligibleForFullVaultUpgrade({ accessSummary, orders }) {
  if (!accessSummary) {
    return { eligible: false, reason: "missing_access_summary" };
  }
  if (accessSummary.hasFullVault) {
    return { eligible: false, reason: "already_full_vault" };
  }
  if (!Array.isArray(accessSummary.bundleIds) || accessSummary.bundleIds.length === 0) {
    return { eligible: false, reason: "no_active_bundle_access" };
  }
  if (!hasPaidDeliveredBundleOrder(orders)) {
    return { eligible: false, reason: "no_qualifying_order_history" };
  }
  return { eligible: true, reason: "eligible" };
}
__name(isEligibleForFullVaultUpgrade, "isEligibleForFullVaultUpgrade");
function getFullVaultUpgradeOffer({ accessSummary, orders }) {
  const eligibility = isEligibleForFullVaultUpgrade({ accessSummary, orders });
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      targetPackId: FULL_VAULT_UPGRADE_TARGET_PACK_ID
    };
  }
  return {
    eligible: true,
    reason: "eligible",
    targetPackId: FULL_VAULT_UPGRADE_TARGET_PACK_ID,
    upgradeAmount: FULL_VAULT_UPGRADE_AMOUNT,
    fullAmount: PACKS.vault_full.amount,
    creditAmount: PACKS.vault_full.amount - FULL_VAULT_UPGRADE_AMOUNT,
    purchaseType: FULL_VAULT_UPGRADE_PURCHASE_TYPE
  };
}
__name(getFullVaultUpgradeOffer, "getFullVaultUpgradeOffer");
var FULL_VAULT_UPGRADE_AMOUNT;
var FULL_VAULT_UPGRADE_TARGET_PACK_ID;
var FULL_VAULT_UPGRADE_PURCHASE_TYPE;
var QUALIFYING_BUNDLE_IDS;
var init_upgrades = __esm({
  "lib/upgrades.js"() {
    init_functionsRoutes_0_785663823963553();
    init_packs();
    FULL_VAULT_UPGRADE_AMOUNT = PACKS.vault_full.amount - PACKS.advertiser.amount;
    FULL_VAULT_UPGRADE_TARGET_PACK_ID = "vault_full";
    FULL_VAULT_UPGRADE_PURCHASE_TYPE = "upgrade";
    QUALIFYING_BUNDLE_IDS = ["advertiser", "commerce", "creator", "brand_launch"];
    __name2(hasPaidDeliveredBundleOrder, "hasPaidDeliveredBundleOrder");
    __name2(isEligibleForFullVaultUpgrade, "isEligibleForFullVaultUpgrade");
    __name2(getFullVaultUpgradeOffer, "getFullVaultUpgradeOffer");
  }
});
async function onRequest7(context) {
  const { request, env } = context;
  const cors = corsHeaders4(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (request.method !== "POST") {
    return json6({ error: "method_not_allowed" }, 405, cors);
  }
  const baseUrl = env.PAYCORE_BASE_URL || "https://pay-staging.appvibe.biz.id";
  const appId = env.PAYCORE_APP_ID || "appvibe_vault";
  const keyId = env.PAYCORE_KEY_ID;
  const appSecret = env.PAYCORE_APP_SECRET;
  const returnUrl = env.PAYCORE_RETURN_URL || "https://appvibe.biz.id/checkout/";
  if (!keyId || !appSecret) {
    return json6(
      {
        error: "payments_not_configured",
        message: "Pembayaran belum siap. Hubungi support jika masalah berlanjut."
      },
      503,
      cors
    );
  }
  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER
  });
  if (!session.ok) {
    return json6({ error: session.error, message: session.message }, session.status, cors);
  }
  const accessSummary = summarizeAccess(session.entitlements);
  const orders = await session.repo.listOrdersByMember(session.member.id);
  const offer = getFullVaultUpgradeOffer({ accessSummary, orders });
  if (offer.reason === "already_full_vault") {
    return json6({ error: "already_full_vault", message: "Akun Anda sudah memiliki Full Vault." }, 409, cors);
  }
  if (!offer.eligible) {
    const status = offer.reason === "no_active_bundle_access" ? 403 : 422;
    return json6(
      {
        error: "upgrade_not_eligible",
        reason: offer.reason,
        message: "Akun Anda belum memenuhi syarat untuk upgrade +50rb ke Full Vault."
      },
      status,
      cors
    );
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const memberName = session.member.name || "Member";
  const email = session.member.email_normalized || `${session.member.id}@member.appvibe.local`;
  const phoneE164 = session.member.phone_e164;
  const pack = PACKS.vault_full;
  const appIdTrigger = pickMeta(body, "app_id");
  const lpVariant = pickMeta(body, "lp_variant") || "brand_studio";
  const lpPlan = pickMeta(body, "lp_plan") || "upgrade";
  const lpPack = pickMeta(body, "lp_pack") || "vault_full";
  const source = pickMeta(body, "source") || "brand_studio_locked_card";
  try {
    const created = await createPaycoreOrderForPack({
      repo: session.repo,
      member: session.member,
      name: memberName,
      email,
      phoneE164,
      packId: "vault_full",
      pack,
      baseUrl,
      appId,
      keyId,
      appSecret,
      returnUrl,
      amountOverride: offer.upgradeAmount,
      purchaseTypeOverride: FULL_VAULT_UPGRADE_PURCHASE_TYPE,
      fulfillmentMeta: {
        source,
        offer_type: "upgrade_full_vault",
        upgrade_from: "bundle_access",
        upgrade_to: "vault_full",
        credit_amount: String(offer.creditAmount),
        upgrade_amount: String(offer.upgradeAmount),
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack,
        app_id: appIdTrigger
      },
      leadMeta: {
        lp_variant: lpVariant,
        lp_plan: lpPlan,
        lp_pack: lpPack
      }
    });
    if (!created.ok) {
      const data = await created.response.json();
      return json6(data, created.response.status, cors);
    }
    return json6(
      {
        ok: true,
        checkout_url: created.paycoreJson.checkout_url,
        order_id: created.paycoreJson.order_id,
        external_order_id: created.paycoreJson.external_order_id,
        payment_status: created.paycoreJson.payment_status || "pending",
        amount: created.amount,
        purchase_type: created.purchaseType
      },
      201,
      cors
    );
  } catch (err) {
    console.error("[Checkout] create-upgrade-order error:", err);
    return json6(
      {
        error: "create_upgrade_order_failed",
        message: "Gagal membuat order upgrade. Silakan coba lagi nanti."
      },
      502,
      cors
    );
  }
}
__name(onRequest7, "onRequest7");
var init_create_upgrade_order = __esm({
  "api/checkout/create-upgrade-order.js"() {
    init_functionsRoutes_0_785663823963553();
    init_entitlements();
    init_packs();
    init_session();
    init_checkout_order();
    init_upgrades();
    __name2(onRequest7, "onRequest");
  }
});
function json7(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json7, "json7");
function corsHeaders5(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === APP_ORIGIN3;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : APP_ORIGIN3,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders5, "corsHeaders5");
async function onRequest8(context) {
  const { request, env } = context;
  const cors = corsHeaders5(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (request.method !== "GET") {
    return json7({ error: "method_not_allowed" }, 405, cors);
  }
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") || "";
  const email = url.searchParams.get("email") || "";
  if (email) {
    return json7({ error: "email_lookup_disabled", message: "Gunakan order_id." }, 400, cors);
  }
  if (!orderId) {
    return json7(
      { error: "missing_param", message: "Parameter order_id diperlukan." },
      400,
      cors
    );
  }
  if (!env.APPVIBE_DB) {
    return json7(
      { error: "storage_unavailable", message: "Database tidak tersedia." },
      503,
      cors
    );
  }
  try {
    const repo = createMemberAccessRepo(env.APPVIBE_DB);
    const order = await repo.getOrderByPaycoreId(orderId);
    if (!order) {
      return json7(
        { error: "order_not_found", message: "Order tidak ditemukan." },
        404,
        cors
      );
    }
    if (order.payment_status === "pending" || order.payment_status === "created") {
      try {
        const baseUrl = env.PAYCORE_BASE_URL || "https://pay-staging.appvibe.biz.id";
        const appId = env.PAYCORE_APP_ID || "appvibe_vault";
        const keyId = env.PAYCORE_KEY_ID;
        const appSecret = env.PAYCORE_APP_SECRET;
        if (keyId && appSecret) {
          const { signPayCoreRequest: signPayCoreRequest2 } = await Promise.resolve().then(() => (init_paycore_sign(), paycore_sign_exports));
          const ts = (/* @__PURE__ */ new Date()).toISOString();
          const rawBody = "{}";
          const sig = await signPayCoreRequest2({
            appSecret,
            timestamp: ts,
            method: "GET",
            path: `/v1/orders/${orderId}`,
            rawBody
          });
          const paycoreRes = await fetch(
            `${baseUrl.replace(/\/+$/, "")}/v1/orders/${orderId}`,
            {
              headers: {
                "X-PayCore-App": appId,
                "X-PayCore-Key-Id": keyId,
                "X-PayCore-Timestamp": ts,
                "X-PayCore-Signature": `sha256=${sig}`,
                "Content-Type": "application/json"
              }
            }
          );
          if (paycoreRes.ok) {
            const paycoreData = await paycoreRes.json();
            const remoteStatus = paycoreData.payment_status;
            if (remoteStatus && remoteStatus !== order.payment_status) {
              const updated = await repo.updateOrderPaymentStatus({
                paycore_order_id: orderId,
                payment_status: remoteStatus
              });
              if (updated) order.payment_status = updated.payment_status;
            }
          }
        }
      } catch (err) {
        console.error("Status reconciliation failed:", err);
      }
    }
    return json7(
      {
        order_id: order.paycore_order_id,
        external_order_id: order.external_order_id,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        amount: order.amount,
        currency: order.currency,
        pack_id: order.pack_id,
        created_at: order.created_at,
        updated_at: order.updated_at
      },
      200,
      cors
    );
  } catch (err) {
    console.error("[Status] error:", err);
    return json7({ error: "status_failed", message: "Gagal memeriksa status." }, 500, cors);
  }
}
__name(onRequest8, "onRequest8");
var APP_ORIGIN3;
var init_status = __esm({
  "api/checkout/status.js"() {
    init_functionsRoutes_0_785663823963553();
    init_db();
    APP_ORIGIN3 = "https://appvibe.biz.id";
    __name2(json7, "json");
    __name2(corsHeaders5, "corsHeaders");
    __name2(onRequest8, "onRequest");
  }
});
function errorResponse(request, { status, error, message }) {
  const accept = request.headers.get("Accept") || "";
  const isBrowser = accept.includes("text/html");
  if (isBrowser) {
    const title = {
      400: "Permintaan Tidak Valid",
      401: "Sesi Berakhir",
      403: "Akses Ditolak",
      404: "Tidak Ditemukan",
      503: "Belum Tersedia"
    }[status] || "Terjadi Kesalahan";
    const hint = {
      401: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
      403: "Anda tidak memiliki akses ke item ini.",
      503: "Sumber daya ini belum dikonfigurasi. Hubungi support jika Anda memerlukan bantuan."
    }[status] || "Silakan kembali ke portal dan coba lagi.";
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${title} \u2014 AppVibe</title>
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
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer"
      }
    });
  }
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
__name(errorResponse, "errorResponse");
var init_error_page = __esm({
  "lib/error-page.js"() {
    init_functionsRoutes_0_785663823963553();
    __name2(errorResponse, "errorResponse");
  }
});
async function onRequest9(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return errorResponse(request, { status: 405, error: "method_not_allowed", message: "Metode tidak diizinkan." });
  }
  const appId = new URL(request.url).searchParams.get("app_id");
  if (!appId) {
    return errorResponse(request, { status: 400, error: "missing_app_id", message: "Parameter app_id diperlukan." });
  }
  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER
  });
  if (!session.ok) {
    return errorResponse(request, { status: session.status, error: session.error, message: session.message });
  }
  const unlockedIds = computeUnlockedAppIds(session.entitlements);
  if (!unlockedIds.includes(appId)) {
    return errorResponse(request, {
      status: 403,
      error: "forbidden",
      message: "Anda tidak memiliki akses ke aplikasi ini."
    });
  }
  const isDev = env.ENVIRONMENT === "development";
  const url = await getStoredAppLaunchUrl(env.APPVIBE_DB, appId, { allowLocalhost: isDev }) || getAppLaunchUrl(appId, env.ACCESS_RESOURCE_URLS_JSON);
  if (!url) {
    return errorResponse(request, {
      status: 503,
      error: "app_not_configured",
      message: "URL aplikasi belum dikonfigurasi. Hubungi support."
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer"
    }
  });
}
__name(onRequest9, "onRequest9");
var init_launch = __esm({
  "api/member/launch.js"() {
    init_functionsRoutes_0_785663823963553();
    init_session();
    init_access_resources();
    init_app_links();
    init_entitlements();
    init_error_page();
    __name2(onRequest9, "onRequest");
  }
});
function json8(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json8, "json8");
async function onRequest10(context) {
  const { request, env } = context;
  if (request.method !== "GET") return json8({ error: "method_not_allowed" }, 405);
  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER
  });
  if (!session.ok) {
    return json8({ error: session.error, message: session.message }, session.status);
  }
  const access = summarizeAccess(session.entitlements);
  const orders = await session.repo.listOrdersByMember(session.member.id);
  const apps = access.appIds.map((appId) => {
    const meta = APP_CATALOG[appId];
    return {
      id: appId,
      name: meta?.name || appId,
      label: meta?.label || appId.slice(0, 3).toUpperCase(),
      function: meta?.function || "",
      output: meta?.output || "",
      rebrand: meta?.rebrand || "",
      prompt: meta?.prompt || "",
      accent: meta?.accent || "#126BFF",
      packs: packsForApp(appId)
    };
  });
  const orderSummary = orders.map((o) => ({
    order_id: o.paycore_order_id,
    pack_id: o.pack_id,
    pack_name: PACKS[o.pack_id]?.description || o.pack_id,
    amount: o.amount,
    currency: o.currency,
    payment_status: o.payment_status,
    fulfillment_status: o.fulfillment_status,
    created_at: o.created_at,
    paid_at: o.paid_at
  }));
  const resources = getResourceAvailability(
    access.bundleIds,
    access.hasFullVault,
    env.ACCESS_RESOURCE_URLS_JSON
  );
  const bundles = (access.hasFullVault ? ["advertiser", "commerce", "creator", "brand_launch"] : access.bundleIds).map((bid) => ({
    id: bid,
    name: PACKS[bid]?.description?.replace("White-Label Vault \u2014 ", "") || bid,
    resources: resources.resources[bid] || { marketing_kit: false, guide: false }
  }));
  const upgrade_offer = {
    eligible: !access.hasFullVault && access.bundleIds.length > 0,
    price: 5e4,
    pack_id: "vault_full"
  };
  return json8({
    member_name: session.member.name,
    member_key: session.member.id,
    workspace_key: session.member.id,
    first_name: session.member.name.split(" ")[0],
    has_full_vault: access.hasFullVault,
    bundle_ids: access.bundleIds,
    app_ids: access.appIds,
    apps,
    bundles,
    resources: resources.resources,
    orders: orderSummary,
    upgrade_offer
  });
}
__name(onRequest10, "onRequest10");
var init_me = __esm({
  "api/member/me.js"() {
    init_functionsRoutes_0_785663823963553();
    init_session();
    init_entitlements();
    init_packs();
    init_catalog();
    init_access_resources();
    __name2(json8, "json");
    __name2(onRequest10, "onRequest");
  }
});
async function onRequest11(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return errorResponse(request, { status: 405, error: "method_not_allowed", message: "Metode tidak diizinkan." });
  }
  const url = new URL(request.url);
  const bundleId = url.searchParams.get("bundle_id");
  const resourceType = url.searchParams.get("type");
  if (!bundleId || !resourceType || !VALID_TYPES.includes(resourceType)) {
    return errorResponse(request, {
      status: 400,
      error: "missing_params",
      message: "Parameter bundle_id dan type (marketing_kit|guide) diperlukan."
    });
  }
  if (!CANONICAL_BUNDLES.includes(bundleId)) {
    return errorResponse(request, {
      status: 400,
      error: "invalid_bundle",
      message: "Bundle ID tidak valid."
    });
  }
  const session = await resolveSession({
    request,
    db: env.APPVIBE_DB,
    pepper: env.AUTH_TOKEN_PEPPER
  });
  if (!session.ok) {
    return errorResponse(request, { status: session.status, error: session.error, message: session.message });
  }
  const fullVault = isFullVault(session.entitlements);
  if (!fullVault) {
    const activeBundleIds = session.entitlements.filter((e) => e.status === "active" && e.resource_type === "bundle").map((e) => e.resource_id);
    if (!activeBundleIds.includes(bundleId)) {
      return errorResponse(request, {
        status: 403,
        error: "forbidden",
        message: "Anda tidak memiliki akses ke bundle ini."
      });
    }
  }
  const resources = getBundleResources(bundleId, env.ACCESS_RESOURCE_URLS_JSON);
  const targetUrl = resources[resourceType];
  if (!targetUrl) {
    const typeLabel = resourceType === "marketing_kit" ? "Marketing kit" : "Panduan mulai";
    return errorResponse(request, {
      status: 503,
      error: "resource_not_configured",
      message: `${typeLabel} untuk bundle ini belum tersedia. Hubungi support.`
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer"
    }
  });
}
__name(onRequest11, "onRequest11");
var VALID_TYPES;
var CANONICAL_BUNDLES;
var init_resource = __esm({
  "api/member/resource.js"() {
    init_functionsRoutes_0_785663823963553();
    init_session();
    init_access_resources();
    init_entitlements();
    init_error_page();
    VALID_TYPES = ["marketing_kit", "guide"];
    CANONICAL_BUNDLES = ["advertiser", "commerce", "creator", "brand_launch"];
    __name2(onRequest11, "onRequest");
  }
});
function parseSignature(header) {
  if (!header) return null;
  const t = header.trim();
  return t.startsWith("sha256=") ? t.slice(7) : t;
}
__name(parseSignature, "parseSignature");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
async function verifyPayCoreEvent({
  webhookSecret,
  timestampHeader,
  rawBody,
  signatureHeader,
  maxSkewMs = 5 * 6e4
}) {
  const t = Date.parse(timestampHeader);
  if (Number.isNaN(t)) return false;
  if (Math.abs(Date.now() - t) > maxSkewMs) return false;
  const message = `${timestampHeader}.${rawBody}`;
  const expected = await hmacSha256Hex(webhookSecret, message);
  const provided = parseSignature(signatureHeader);
  return provided !== null && timingSafeEqual(provided, expected);
}
__name(verifyPayCoreEvent, "verifyPayCoreEvent");
var init_paycore_verify = __esm({
  "lib/paycore-verify.js"() {
    init_functionsRoutes_0_785663823963553();
    init_paycore_sign();
    __name2(parseSignature, "parseSignature");
    __name2(timingSafeEqual, "timingSafeEqual");
    __name2(verifyPayCoreEvent, "verifyPayCoreEvent");
  }
});
async function hashData(str) {
  if (!str) return void 0;
  const encoder = new TextEncoder();
  const data = encoder.encode(str.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashData, "hashData");
async function sendCapiPurchase({ env, eventId, order, member }) {
  const pixelId = env.META_PIXEL_ID;
  const token = env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;
  try {
    let fbp, fbc, clientIp3, userAgent;
    if (order.tracking_meta) {
      try {
        const tm = JSON.parse(order.tracking_meta);
        fbp = tm.fbp;
        fbc = tm.fbc;
        clientIp3 = tm.client_ip;
        userAgent = tm.user_agent;
      } catch (e) {
      }
    }
    const emailHash = await hashData(member?.email_normalized);
    const phoneHash = await hashData(member?.phone_e164?.replace(/[^0-9]/g, ""));
    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1e3),
        action_source: "website",
        event_id: eventId,
        user_data: {
          client_ip_address: clientIp3,
          client_user_agent: userAgent,
          fbp,
          fbc,
          em: emailHash ? [emailHash] : void 0,
          ph: phoneHash ? [phoneHash] : void 0
        },
        custom_data: {
          value: order.amount,
          currency: order.currency || "IDR",
          content_name: order.pack_id
        }
      }]
    };
    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("[CAPI] error:", err);
  }
}
__name(sendCapiPurchase, "sendCapiPurchase");
function json9(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json9, "json9");
async function scheduleBackground2(context, promise, label) {
  const guarded = promise.catch((err) => {
    console.error(label, err);
  });
  if (typeof context.waitUntil === "function") {
    context.waitUntil(guarded);
    return;
  }
  await guarded;
}
__name(scheduleBackground2, "scheduleBackground2");
async function onRequest12(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const secret = env.PAYCORE_WEBHOOK_SECRET;
  if (!secret) {
    return json9({ error: "webhook_not_configured" }, 503);
  }
  const rawBody = await request.text();
  const ts = request.headers.get("X-PayCore-Event-Timestamp");
  const sig = request.headers.get("X-PayCore-Event-Signature");
  const ok = await verifyPayCoreEvent({
    webhookSecret: secret,
    timestampHeader: ts || "",
    rawBody,
    signatureHeader: sig || ""
  });
  if (!ok) {
    return json9({ error: "invalid_signature" }, 401);
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json9({ error: "invalid_json" }, 400);
  }
  const eventId = payload.event_id;
  const eventType = payload.event_type;
  const orderId = payload.data?.order_id;
  if (!eventId || !orderId) {
    return json9({ error: "missing_event_fields" }, 400);
  }
  if (!env.APPVIBE_DB) {
    return json9({ error: "storage_unavailable", message: "D1 database is required." }, 503);
  }
  const repo = createMemberAccessRepo(env.APPVIBE_DB);
  if (await repo.isEventSeen(eventId)) {
    return json9({ ok: true, duplicate: true, event_id: eventId }, 200);
  }
  if (eventType !== "payment.succeeded") {
    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: "ignored"
    });
    return json9({ ok: true, event_id: eventId, ignored: true }, 200);
  }
  const order = await repo.getOrderByPaycoreId(orderId);
  if (!order) {
    return json9({ error: "order_not_found", message: "Order tidak ditemukan untuk event ini." }, 404);
  }
  const pack = PACKS[order.pack_id];
  if (!pack) {
    return json9({ error: "invalid_product", message: `Product tidak dikenal: ${order.pack_id}` }, 422);
  }
  const payloadAmount = payload.data?.amount;
  if (typeof payloadAmount === "number" && payloadAmount !== order.amount) {
    return json9({ error: "amount_mismatch", message: "Jumlah pembayaran tidak sesuai order." }, 422);
  }
  if (order.fulfillment_status === "delivered") {
    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: "already_fulfilled"
    });
    return json9({ ok: true, duplicate: true, event_id: eventId }, 200);
  }
  try {
    await repo.fulfillOrder({
      paycore_order_id: orderId,
      paid_at: payload.data?.paid_at,
      fulfilled_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    await repo.markEventSeen({
      event_id: eventId,
      event_type: eventType,
      paycore_order_id: orderId,
      status: "processed"
    });
    await repo.insertAuditLog({
      member_id: order.member_id,
      order_id: order.id,
      event_type: "payment_succeeded",
      metadata_json: JSON.stringify({ event_id: eventId, amount: order.amount })
    });
    const member = await repo.getMemberById(order.member_id);
    await scheduleBackground2(
      context,
      sendCapiPurchase({ env, eventId, order, member }),
      "[CAPI] Purchase failed:"
    );
    const fulfillmentWebhook = env.FULFILLMENT_WEBHOOK_URL || env.LEAD_WEBHOOK_URL;
    if (fulfillmentWebhook) {
      const fulfillmentTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      await scheduleBackground2(
        context,
        (async () => {
          const body = JSON.stringify({
            name: member?.name || "",
            email: member?.email_normalized || "",
            whatsapp: member?.phone_e164 || "",
            niche: order.pack_id,
            model_penggunaan: "purchase",
            selected_pack: order.pack_id,
            selected_app: "",
            form_open_source: "paycore_webhook",
            utm_source: "",
            utm_medium: "",
            utm_campaign: "",
            utm_content: "",
            utm_term: "",
            referrer: "",
            landing_url: "",
            device_type: "",
            captured_at: fulfillmentTimestamp,
            order_id: orderId,
            order_status: "paid",
            fulfilled_at: fulfillmentTimestamp
          });
          let fwdRes = await fetch(fulfillmentWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            redirect: "manual",
            body
          });
          if (fwdRes.status === 302) {
            const location = fwdRes.headers.get("location");
            if (location) {
              fwdRes = await fetch(location, { redirect: "follow" });
            }
          }
        })(),
        "[Fulfillment] webhook forwarding failed:"
      );
    }
    if (env.AVF_EVENT_URL) {
      await scheduleBackground2(
        context,
        (async () => {
          try {
            const { postEventToFlow: postEventToFlow2 } = await Promise.resolve().then(() => (init_avf_client(), avf_client_exports));
            await postEventToFlow2(env, {
              type: "payment.paid",
              contact: {
                name: member?.name || "",
                email: member?.email_normalized || "",
                phone: member?.phone_e164 || ""
              },
              data: {
                product_name: pack.description || pack.product_key || order.pack_id,
                pack_id: order.pack_id,
                amount: order.amount,
                order_id: orderId
              }
            });
          } catch (e) {
            console.error("[AVF] payment.paid event failed:", e.message);
          }
        })(),
        "[AVF] payment.paid event failed:"
      );
    }
    return json9(
      { ok: true, event_id: eventId, order_id: orderId, fulfillment_status: "delivered" },
      200
    );
  } catch (err) {
    console.error("[Fulfillment] error:", err);
    return json9({ error: "fulfillment_failed", message: err.message }, 500);
  }
}
__name(onRequest12, "onRequest12");
var init_paycore = __esm({
  "api/webhooks/paycore.js"() {
    init_functionsRoutes_0_785663823963553();
    init_paycore_verify();
    init_packs();
    init_db();
    __name2(hashData, "hashData");
    __name2(sendCapiPurchase, "sendCapiPurchase");
    __name2(json9, "json");
    __name2(scheduleBackground2, "scheduleBackground");
    __name2(onRequest12, "onRequest");
  }
});
function json10(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
__name(json10, "json10");
function corsHeaders6(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === APP_ORIGIN4;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : APP_ORIGIN4,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders6, "corsHeaders6");
async function onRequest13(context) {
  const { request } = context;
  const cors = corsHeaders6(request);
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  return json10(
    {
      error: "endpoint_disabled",
      message: "Akses berbasis email dinonaktifkan. Masuk melalui WhatsApp di halaman /access/.",
      login_url: "/access/"
    },
    410,
    cors
  );
}
__name(onRequest13, "onRequest13");
var APP_ORIGIN4;
var init_access = __esm({
  "api/access.js"() {
    init_functionsRoutes_0_785663823963553();
    APP_ORIGIN4 = "https://appvibe.biz.id";
    __name2(json10, "json");
    __name2(corsHeaders6, "corsHeaders");
    __name2(onRequest13, "onRequest");
  }
});
var routes;
var init_functionsRoutes_0_785663823963553 = __esm({
  "../.wrangler/tmp/pages-D7jt6r/functionsRoutes-0.785663823963553.mjs"() {
    init_app_links2();
    init_orders();
    init_consume_magic_link();
    init_logout();
    init_request_magic_link();
    init_create_order();
    init_create_upgrade_order();
    init_status();
    init_launch();
    init_me();
    init_resource();
    init_paycore();
    init_access();
    routes = [
      {
        routePath: "/api/admin/app-links",
        mountPath: "/api/admin",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/admin/orders",
        mountPath: "/api/admin",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      },
      {
        routePath: "/api/auth/consume-magic-link",
        mountPath: "/api/auth",
        method: "",
        middlewares: [],
        modules: [onRequest3]
      },
      {
        routePath: "/api/auth/logout",
        mountPath: "/api/auth",
        method: "",
        middlewares: [],
        modules: [onRequest4]
      },
      {
        routePath: "/api/auth/request-magic-link",
        mountPath: "/api/auth",
        method: "",
        middlewares: [],
        modules: [onRequest5]
      },
      {
        routePath: "/api/checkout/create-order",
        mountPath: "/api/checkout",
        method: "",
        middlewares: [],
        modules: [onRequest6]
      },
      {
        routePath: "/api/checkout/create-upgrade-order",
        mountPath: "/api/checkout",
        method: "",
        middlewares: [],
        modules: [onRequest7]
      },
      {
        routePath: "/api/checkout/status",
        mountPath: "/api/checkout",
        method: "",
        middlewares: [],
        modules: [onRequest8]
      },
      {
        routePath: "/api/member/launch",
        mountPath: "/api/member",
        method: "",
        middlewares: [],
        modules: [onRequest9]
      },
      {
        routePath: "/api/member/me",
        mountPath: "/api/member",
        method: "",
        middlewares: [],
        modules: [onRequest10]
      },
      {
        routePath: "/api/member/resource",
        mountPath: "/api/member",
        method: "",
        middlewares: [],
        modules: [onRequest11]
      },
      {
        routePath: "/api/webhooks/paycore",
        mountPath: "/api/webhooks",
        method: "",
        middlewares: [],
        modules: [onRequest12]
      },
      {
        routePath: "/api/access",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest13]
      }
    ];
  }
});
init_functionsRoutes_0_785663823963553();
init_functionsRoutes_0_785663823963553();
init_functionsRoutes_0_785663823963553();
init_functionsRoutes_0_785663823963553();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_785663823963553();
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_785663823963553();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_785663823963553();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// C:/Users/bimap/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// C:/Users/bimap/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-oxpXV5/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// C:/Users/bimap/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-oxpXV5/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.1741688748827347.js.map
