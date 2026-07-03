import { ALL_APP_IDS } from './packs.js';
import { MARKETING_KIT_HTML } from './marketing-kit-content.js';

export function hasKit(appId) {
  return ALL_APP_IDS.includes(appId) && typeof MARKETING_KIT_HTML[appId] === 'string'
    && MARKETING_KIT_HTML[appId].length > 0;
}

export function getKitHtml(appId) {
  if (!hasKit(appId)) return null;
  return MARKETING_KIT_HTML[appId];
}

export function getKitTitle(html) {
  if (!html) return '';
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

export function extractPlainText(html) {
  if (!html) return '';
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<\/(p|div|h[1-6]|li|br|section|header|footer|tr)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/&amp;/gi, '&');
  s = s.replace(/&lt;/gi, '<');
  s = s.replace(/&gt;/gi, '>');
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}