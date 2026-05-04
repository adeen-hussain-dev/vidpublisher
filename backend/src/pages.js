import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = (channel) => path.join(__dirname, '..', 'tokens', `${channel}_yt_token.json`);
const logo = (file) => path.join(__dirname, '..', 'assets', 'logos', file);

export const PAGES = [
  // ── Lena Voss ──────────────────────────────────────────────────────────────
  {
    id: 'lena_voss_fb',
    name: 'Lena Voss',
    platform: 'facebook',
    icon: '👤',
    logoPath: logo('lena_voss.png'),
    pageId: process.env.LENA_VOSS_FB_PAGE_ID,
    token: process.env.LENA_VOSS_FB_TOKEN,
  },
  {
    id: 'lena_voss_yt',
    name: 'Lena Voss',
    platform: 'youtube',
    icon: '👤',
    logoPath: logo('lena_voss.png'),
    tokenPath: token('lena_voss'),
    clientId: process.env.LENA_VOSS_YT_CLIENT_ID,
    clientSecret: process.env.LENA_VOSS_YT_CLIENT_SECRET,
  },
  // ── Marlo Works ────────────────────────────────────────────────────────────
  {
    id: 'marlo_works_fb',
    name: 'Marlo Works',
    platform: 'facebook',
    icon: '🎬',
    logoPath: logo('marlo_works.png'),
    pageId: process.env.MARLO_WORKS_FB_PAGE_ID,
    token: process.env.MARLO_WORKS_FB_TOKEN,
  },
  {
    id: 'marlo_works_yt',
    name: 'Marlo Works',
    platform: 'youtube',
    icon: '🎬',
    logoPath: logo('marlo_works.png'),
    tokenPath: token('marlo_works'),
    clientId: process.env.MARLO_WORKS_YT_CLIENT_ID,
    clientSecret: process.env.MARLO_WORKS_YT_CLIENT_SECRET,
  },
  // ── Tiny Titans War ────────────────────────────────────────────────────────
  {
    id: 'tiny_titans_war_fb',
    name: 'Tiny Titans War',
    platform: 'facebook',
    icon: '🐜',
    logoPath: logo('tiny_titans_war.png'),
    pageId: process.env.TINY_TITANS_WAR_FB_PAGE_ID,
    token: process.env.TINY_TITANS_WAR_FB_TOKEN,
  },
  {
    id: 'tiny_titans_war_yt',
    name: 'Tiny Titans War',
    platform: 'youtube',
    icon: '🐜',
    logoPath: logo('tiny_titans_war.png'),
    tokenPath: token('tiny_titans_war'),
    clientId: process.env.TINY_TITANS_WAR_YT_CLIENT_ID,
    clientSecret: process.env.TINY_TITANS_WAR_YT_CLIENT_SECRET,
  },
  // ── Restore & Roar ────────────────────────────────────────────────────────
  {
    id: 'restore_roar_fb',
    name: 'Restore & Roar',
    platform: 'facebook',
    icon: '🦁',
    logoPath: logo('restore_roar.png'),
    pageId: process.env.RESTORE_ROAR_FB_PAGE_ID,
    token: process.env.RESTORE_ROAR_FB_TOKEN,
  },
  {
    id: 'restore_roar_yt',
    name: 'Restore & Roar',
    platform: 'youtube',
    icon: '🦁',
    logoPath: logo('restore_roar.png'),
    tokenPath: token('restore_roar'),
    clientId: process.env.RESTORE_ROAR_YT_CLIENT_ID,
    clientSecret: process.env.RESTORE_ROAR_YT_CLIENT_SECRET,
  },
  // ── WildScope ──────────────────────────────────────────────────────────────
  {
    id: 'wildscope_fb',
    name: 'WildScope',
    platform: 'facebook',
    icon: '🔭',
    logoPath: logo('wildscope.png'),
    pageId: process.env.WILDSCOPE_FB_PAGE_ID,
    token: process.env.WILDSCOPE_FB_TOKEN,
  },
  {
    id: 'wildscope_yt',
    name: 'WildScope',
    platform: 'youtube',
    icon: '🔭',
    logoPath: logo('wildscope.png'),
    tokenPath: token('wildscope'),
    clientId: process.env.WILDSCOPE_YT_CLIENT_ID,
    clientSecret: process.env.WILDSCOPE_YT_CLIENT_SECRET,
  },
];

export function getPage(id) {
  return PAGES.find(p => p.id === id);
}
