/**
 * App catalog — public, non-secret metadata for each of the 13 vault apps.
 *
 * This file is the single source of truth for app names, descriptions,
 * suggested rebrand names, and pack membership used in the access portal UI.
 *
 * IMPORTANT: This file does NOT contain any URLs. App launch URLs, marketing
 * kit URLs, and resource URLs are resolved server-side from the
 * ACCESS_RESOURCE_URLS_JSON environment variable, never from frontend code.
 */

import { PACKS } from './packs.js';

export const APP_CATALOG = {
  adsprint: {
    name: 'ADSprint',
    label: 'ADS',
    function: 'Campaign Command Center',
    output: 'Riset audience, struktur kampanye, dan ringkasan performa.',
    rebrand: 'Campaign Blueprint AI',
    prompt: 'Mulai dari satu kampanye iklan. Riset audience, bangun struktur kampanye, lalu ringkas performanya.',
    accent: '#126BFF',
  },
  pikat: {
    name: 'PIKAT',
    label: 'PIK',
    function: 'Affiliate Content Factory',
    output: 'Draft konten afiliasi, hook, dan rekomendasi placement.',
    rebrand: 'Affiliate Content Engine',
    prompt: 'Siapkan konten afiliasi pertama Anda — draft, hook, dan penempatan dalam satu alur.',
    accent: '#10DCD5',
  },
  rupa: {
    name: 'RUPA',
    label: 'RPA',
    function: 'Visual Commerce Studio',
    output: 'Konsep visual produk, deskripsi listing, dan ringkasan katalog.',
    rebrand: 'Winning Creative AI',
    prompt: 'Bangun visual produk — konsep, deskripsi listing, dan ringkasan katalog untuk satu produk.',
    accent: '#6D35FF',
  },
  mula: {
    name: 'MULA',
    label: 'MLA',
    function: 'Launch Campaign Atelier',
    output: 'Timeline peluncuran, daftar channel, dan draft pengumuman.',
    rebrand: 'Launch Map AI',
    prompt: 'Rancang peluncuran — timeline, channel utama, dan draft pengumuman pertama.',
    accent: '#198CFF',
  },
  arah: {
    name: 'ARAH',
    label: 'ARH',
    function: 'Brand Atlas Studio',
    output: 'Ringkasan positioning, target pelanggan, dan rekomendasi arah visual.',
    rebrand: 'Brand Compass AI',
    prompt: 'Jelaskan bisnis Anda — dapatkan positioning, target pelanggan, dan arah visual.',
    accent: '#0B2352',
  },
  cetak: {
    name: 'CETAK',
    label: 'CTK',
    function: 'Print Campaign Studio',
    output: 'Layout materi cetak, copy iklan, dan ringkasan spesifikasi.',
    rebrand: 'Campaign Print Kit AI',
    prompt: 'Siapkan materi cetak — layout, copy iklan, dan spesifikasi dalam satu workspace.',
    accent: '#A0392C',
  },
  adegan: {
    name: 'ADEGAN',
    label: 'ADG',
    function: "Director's Treatment Lab",
    output: 'Draft naskah iklan, shot list, dan ringkasan visual.',
    rebrand: 'Video Ad Script Lab',
    prompt: 'Tulis treatment iklan — naskah, shot list, dan ringkasan visual.',
    accent: '#8756FF',
  },
  suara: {
    name: 'SUARA',
    label: 'SRA',
    function: 'Voice Direction Desk',
    output: 'Karakter suara brand, panduan tone, dan contoh script.',
    rebrand: 'Voice Brand Director AI',
    prompt: 'Definisikan suara brand — karakter, tone, dan contoh script.',
    accent: '#10DCD5',
  },
  bukti: {
    name: 'BUKTI',
    label: 'BKT',
    function: 'Social Proof Ledger',
    output: 'Template testimonial, struktur studi kasus, dan ringkasan bukti.',
    rebrand: 'Trust Builder AI',
    prompt: 'Kumpulkan bukti sosial — template testimonial, studi kasus, dan ringkasan kepercayaan.',
    accent: '#16866D',
  },
  mimik: {
    name: 'MIMIK',
    label: 'MMK',
    function: 'Persona Continuity Studio',
    output: 'Karater persona, bahasa konsisten, dan panduan ekspresi.',
    rebrand: 'Brand Voice OS',
    prompt: 'Bangun persona brand — karakter, bahasa konsisten, dan panduan ekspresi.',
    accent: '#6D35FF',
  },
  ritme: {
    name: 'RITME',
    label: 'RTM',
    function: 'Editorial Rhythm Planner',
    output: 'Kalender konten, struktur series, dan ringkasan frekuensi.',
    rebrand: 'Content Rhythm AI',
    prompt: 'Rencanakan ritme konten — kalender, series, dan frekuensi.',
    accent: '#198CFF',
  },
  tayang: {
    name: 'TAYANG',
    label: 'TYG',
    function: 'Website Blueprint Lab',
    output: 'Sitemap, wireframe halaman utama, dan ringkasan alur.',
    rebrand: 'Landing Page Blueprint AI',
    prompt: 'Rancang website — sitemap, wireframe halaman utama, dan alur pengunjung.',
    accent: '#126BFF',
  },
  katalog: {
    name: 'KATALOG',
    label: 'KTL',
    function: 'Marketplace Merchandising Board',
    output: 'Optimasi listing, struktur etalase, dan ringkasan kategori.',
    rebrand: 'Marketplace Growth AI',
    prompt: 'Optimalkan katalog — listing, etalase, dan kategori.',
    accent: '#10DCD5',
  },
};

/** All 13 app IDs in canonical order. */
export const ALL_CATALOG_IDS = Object.keys(APP_CATALOG);

/**
 * Which bundles does a given app belong to?
 * Computed from packs.js — never hardcoded separately.
 */
export function packsForApp(appId) {
  return Object.entries(PACKS)
    .filter(([_, pack]) => pack.appIds.includes(appId))
    .map(([packId]) => packId);
}
