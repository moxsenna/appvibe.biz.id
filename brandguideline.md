# AppVibe Brand Guidelines

**Brand:** AppVibe  
**Domain:** `appvibe.biz.id`  
**Version:** 1.0  
**Status:** Working brand system  
**Primary use in this repo:** Product sales site, product portfolio, landing page, checkout experience, app ecosystem, social assets, and sales materials for AppVibe digital products.

> Repository boundary: `appvibe.biz.id` is not the same project as `appvibe.web.id`. The `appvibe.web.id` service-business website lives in `D:\Coding\AppVibe v2`.

---

## 1. Brand Foundation

### Brand idea

**AppVibe** is a digital product studio and showcase ecosystem for useful, well-crafted web applications, AI tools, landing pages, and business systems. In this repository, that brand is expressed as a product sales and checkout site for AppVibe digital products.

The name combines:

- **App** — practical digital products, interfaces, systems, and tools.
- **Vibe** — a distinct creative character, clarity, energy, and a modern product feel.

### Core promise

> Turn business ideas into digital products people can understand, trust, and use.

### Brand personality

AppVibe should feel:

- **Modern, but not cold**
- **Creative, but not chaotic**
- **Technical, but understandable**
- **Premium, but approachable**
- **Fast-moving, but intentional**
- **Confident, but never overclaiming**

### Positioning

AppVibe is not positioned here as a generic “website jasa” provider. That service-business context belongs to `appvibe.web.id`. In this repo, AppVibe is positioned as a **product-minded digital product brand**: a catalog and checkout experience for clear, conversion-aware, usable digital products.

### Voice keywords

`Product-led` · `Clear` · `Useful` · `Sharp` · `Human` · `Optimistic` · `Direct`

---

## 2. Logo System

### Primary logo

The primary logo is a horizontal lockup consisting of:

1. The **App Modules icon** on the left.
2. The **AppVibe wordmark** on the right.

Use this version for:

- Website header
- Proposal cover
- Landing page footer
- Portfolio page
- Social profile banners
- Presentation title slide
- Email signature
- Partner-facing materials

### Icon concept

The AppVibe icon is made of modular, rounded app-like blocks. Its negative space forms a **V**, representing:

- A collection of multiple applications under one ecosystem
- A clear route from idea to execution
- The “Vibe” signature: energetic, recognizable, and creative
- A modular platform that can expand without losing its identity

### Approved logo versions

| Version | Background | Wordmark | Recommended usage |
|---|---|---|---|
| Primary light | White or very light neutral | Deep navy | Most website sections, decks, documents |
| Primary dark | Navy / charcoal / dark gradient | White | Dark hero sections, dark portfolio cards, video end cards |
| Icon only | Light or dark | N/A | Favicon, app icon, social avatar, compact navigation |
| Monochrome dark | White/light background | Deep navy / black | Print fallback, single-color production |
| Monochrome light | Dark background | White | Restricted one-color use on dark media |

### Clear space

Maintain empty space around the logo equal to at least **25% of the icon height** on all sides.

Example: if the icon is 48 px tall, keep at least 12 px free from nearby text, borders, controls, or other marks.

### Minimum sizes

| Asset | Minimum size |
|---|---:|
| Horizontal logo for digital use | 160 px wide |
| Horizontal logo for print | 35 mm wide |
| Icon-only favicon | 16 × 16 px |
| Icon-only app/social avatar | 48 × 48 px |
| Header logo icon | 28–40 px |
| Full wordmark in header | 130–180 px wide |

### Do not

- Do not stretch, compress, skew, or rotate the logo.
- Do not recolor individual modules randomly.
- Do not add outlines, bevels, drop shadows, or gradients to the wordmark.
- Do not place the light wordmark on a light background.
- Do not use the icon as a generic decorative shape when it cannot be recognized.
- Do not recreate the mark with emoji, text symbols, or unrelated geometric components.
- Do not place the full logo on visually noisy imagery without a contrast layer.

---

## 3. Color System

AppVibe uses a deep navy foundation with vibrant product accents. The palette should feel digital and premium, not childish or overly neon.

### Core colors

| Token | Hex | Use |
|---|---|---|
| `--av-navy-950` | `#050B1D` | Dark background, premium hero, dark-mode canvas |
| `--av-navy-900` | `#07142F` | Main dark surface, wordmark on light |
| `--av-navy-800` | `#0B2352` | Dark elevated surface, icon depth |
| `--av-blue-600` | `#126BFF` | Primary CTA, top-left logo module |
| `--av-blue-500` | `#198CFF` | Hover / bright blue accent |
| `--av-cyan-500` | `#10DCD5` | Highlight, top-right logo module |
| `--av-violet-600` | `#6D35FF` | Product accent, bottom-right logo module |
| `--av-violet-500` | `#8756FF` | Gradient endpoint / secondary accent |
| `--av-white` | `#FFFFFF` | Main light surface, text on dark |
| `--av-slate-100` | `#EEF3FA` | Soft canvas / light background |
| `--av-slate-300` | `#C9D4E5` | Divider / border |
| `--av-slate-500` | `#66748D` | Secondary text |
| `--av-ink` | `#10203F` | Main text on light backgrounds |

### Recommended gradients

**Logo / hero gradient**
```css
background: linear-gradient(135deg, #126BFF 0%, #10DCD5 48%, #8756FF 100%);
```

**Dark hero atmosphere**
```css
background:
  radial-gradient(circle at 20% 20%, rgba(25, 140, 255, 0.18), transparent 35%),
  radial-gradient(circle at 78% 70%, rgba(109, 53, 255, 0.16), transparent 34%),
  #050B1D;
```

**Soft product surface**
```css
background: linear-gradient(145deg, #FFFFFF 0%, #EEF3FA 100%);
```

### Color usage rule

Use the color hierarchy below:

- **70%** neutral base: navy, white, slate.
- **20%** primary blue and cyan.
- **10%** violet or special product accents.

Do not use every accent in every screen. A product page may use blue + cyan, while another may use blue + violet, as long as the parent AppVibe identity remains visible.

---

## 4. Typography

### Primary typeface

**Plus Jakarta Sans**  
Use for most AppVibe website and product UI contexts.

Recommended weights:

- `400` — body copy
- `500` — labels and supporting copy
- `600` — navigation, UI controls
- `700` — headings, buttons, emphasis
- `800` — rare high-impact hero headline

### Display typeface

**Space Grotesk**  
Use for selected hero headlines, product labels, large numerical statements, and modern technical emphasis.

Recommended use:

- Landing page hero headlines
- Product feature titles
- Portfolio metrics
- Product category labels

### Mono / technical typeface

**DM Mono**  
Use sparingly for:

- Product tags
- System labels
- Metadata
- Version numbers
- Mini labels such as `BUILT FOR BUSINESS`

### Type scale

| Role | Font | Desktop | Mobile | Weight | Line-height |
|---|---|---:|---:|---:|---:|
| Display / Hero | Space Grotesk | 56–72 px | 36–44 px | 700 | 0.98–1.08 |
| H1 | Plus Jakarta Sans | 44–56 px | 32–40 px | 800 | 1.05 |
| H2 | Plus Jakarta Sans | 32–40 px | 26–30 px | 700 | 1.15 |
| H3 | Plus Jakarta Sans | 22–26 px | 20–22 px | 700 | 1.25 |
| Body large | Plus Jakarta Sans | 18 px | 16–17 px | 400–500 | 1.6 |
| Body | Plus Jakarta Sans | 15–16 px | 15–16 px | 400 | 1.65 |
| UI label | Plus Jakarta Sans | 13–14 px | 13–14 px | 600 | 1.2 |
| Technical label | DM Mono | 10–12 px | 10–11 px | 500 | 1.3 |

### Type rules

- Use sentence case for almost all UI labels and headings.
- Avoid excessive ALL CAPS. Reserve it for small metadata labels.
- Avoid long paragraphs in heroes. One clear promise, one supporting sentence, one CTA.
- Do not use more than two font families in one AppVibe screen, excluding mono metadata.

---

## 5. Visual Language

### Shape language

The visual system is based on **rounded modules**.

Use:

- Rounded rectangles
- Modular cards
- Clean grid systems
- Soft 12–28 px corner radii
- Structured spacing
- Simple geometric illustrations
- Subtle glow or ambient gradients in dark sections

Avoid:

- Random blob shapes without structural purpose
- Overly glassmorphic interfaces
- Heavy 3D realism
- Excessively playful sticker aesthetics
- Generic AI sparkles as the primary visual motif

### Radius scale

| Token | Value | Use |
|---|---:|---|
| `--radius-sm` | 10 px | Input, compact button, tag |
| `--radius-md` | 14 px | Button, icon container |
| `--radius-lg` | 20 px | Standard card |
| `--radius-xl` | 28 px | Hero card, major section |
| `--radius-pill` | 999 px | Status chip, compact filter |

### Shadows

Use restrained, soft shadows on light backgrounds and atmospheric depth on dark backgrounds.

```css
/* Light surface */
box-shadow: 0 12px 30px rgba(10, 28, 66, 0.08);

/* Floating dark surface */
box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
```

Avoid sharp, heavy black shadows unless a specific sub-brand intentionally uses a bold editorial style.

### Illustration direction

Preferred:

- App windows and modular interface fragments
- Product maps, workflows, cards, and dashboards
- Abstract technical landscapes
- Layered rounded blocks
- Simple line diagrams
- Controlled gradients

Not preferred:

- Generic people shaking hands
- Random robots
- Overused “AI brain” icons
- Stock-style office imagery unless a real client story requires it

---

## 6. UI Direction

### UI principle

> Every AppVibe screen should make the next useful action obvious.

### Layout

- Maximum content width: `1200–1440 px`
- Desktop page gutter: `24–48 px`
- Mobile page gutter: `16–20 px`
- Major section spacing: `72–120 px` desktop; `48–72 px` mobile
- Card gaps: `12–24 px`
- Prefer one primary CTA per visual section.

### Buttons

#### Primary button

Use for the primary conversion action.

```css
background: #126BFF;
color: #FFFFFF;
border-radius: 14px;
font-weight: 700;
```

Hover: brighten slightly, lift by 1–2 px, preserve stable layout.

#### Secondary button

Use for supporting navigation or less-committal actions.

```css
background: #FFFFFF;
color: #10203F;
border: 1px solid #C9D4E5;
```

#### Dark button

Use on pale, bright, or high-contrast content.

```css
background: #07142F;
color: #FFFFFF;
```

### Cards

Cards should:

- Have a clear hierarchy
- Use one main message
- Avoid dense walls of text
- Use a meaningful icon, visual, or metric when appropriate
- Support mobile stacking without hiding essential information

### Mobile behavior

AppVibe audiences will often arrive from mobile ads or direct WhatsApp links. Treat mobile as the primary experience, not a scaled-down desktop layout.

Required behavior:

- Buttons must remain visible and tappable.
- Minimum interactive height: **44 px**.
- Avoid horizontal scrolling except for deliberately designed category rails.
- Use 1-column stacks for complex cards by default.
- Avoid text that becomes smaller than **14 px**.
- Keep the first CTA visible quickly without requiring excessive scroll.
- Do not use hover as the only way to reveal key information.

---

## 7. Writing Style

### Tone

Write as a capable product partner.

- Start with the outcome, not the technology.
- Explain systems in practical language.
- Use Indonesian that is direct and readable.
- Use English terms only when they make the message clearer to a digital-product audience.
- Prefer specifics over exaggerated claims.

### Preferred examples

- “Bikin landing page yang membuat calon pelanggan langsung paham langkah berikutnya.”
- “Dari ide mentah sampai aplikasi yang siap diuji pengguna.”
- “Sistem yang membantu tim bergerak lebih rapi, bukan sekadar terlihat modern.”
- “Mulai dari satu alur penting, lalu kembangkan saat sudah terbukti dipakai.”

### Avoid

- “Solusi digital terdepan”
- “Revolusioner”
- “One-stop solution” without clear proof
- “AI-powered” as the main benefit
- “Kami menjamin hasil” unless a contractual guarantee exists
- Long, abstract agency-style statements

### Product naming structure

For AppVibe-owned tools, use concise Indonesian names that signal one clear function:

- `ARAH` — brand direction
- `MULA` — launch planning
- `RUPA` — visual commerce
- `TAYANG` — website blueprint
- `PIKAT` — affiliate content
- `BUKTI` — social proof
- `RITME` — editorial planning
- `SUARA` — voice direction
- `ADEGAN` — director treatment
- `CETAK` — print campaign
- `MIMIK` — persona continuity
- `KATALOG` — marketplace merchandising
- `Adsprint` — campaign command center

Each product can have a distinct interface mood, but must retain:

1. Clear hierarchy
2. Strong readability
3. Functional responsiveness
4. Intentional color system
5. A consistent quality bar

---

## 8. AppVibe Architecture: Parent Brand and Product Brands

### Parent brand role

**AppVibe** is the umbrella brand. It should remain:

- Clear
- Modern
- Neutral enough to host diverse products
- Recognizable in dark and light environments
- More systematic than any individual product sub-brand

### Product brand role

Individual products may use different moods:

- Editorial
- Technical
- Playful
- Dark console
- Bold commerce
- Premium studio

This is intentional. The AppVibe parent brand creates cohesion through:

- Shared product quality
- Modular design thinking
- Clear UX
- Product-first copy
- Strong mobile usability
- AppVibe logo endorsement in appropriate locations

### Endorsement pattern

Use one of these patterns:

```text
[Product Logo]
by AppVibe
```

```text
Built by AppVibe
```

```text
An AppVibe product
```

Do not force the AppVibe logo into every screen. Place it in the product landing page footer, legal/about view, loading screen, account portal, or shared product directory.

---

## 9. Accessibility Baseline

- Ensure body text contrast meets at least WCAG AA where feasible.
- Do not encode critical meaning with color alone.
- Provide visible focus states for all interactive components.
- Use readable label names instead of icon-only critical controls.
- Maintain at least 44 × 44 px touch targets.
- Do not autoplay audio.
- For motion, respect reduced-motion user preferences.
- Use alt text that communicates purpose, not merely appearance.

---

## 10. CSS Tokens

```css
:root {
  /* Brand */
  --av-navy-950: #050B1D;
  --av-navy-900: #07142F;
  --av-navy-800: #0B2352;
  --av-ink: #10203F;

  /* Accent */
  --av-blue-600: #126BFF;
  --av-blue-500: #198CFF;
  --av-cyan-500: #10DCD5;
  --av-violet-600: #6D35FF;
  --av-violet-500: #8756FF;

  /* Neutral */
  --av-white: #FFFFFF;
  --av-slate-100: #EEF3FA;
  --av-slate-200: #E2EAF5;
  --av-slate-300: #C9D4E5;
  --av-slate-500: #66748D;

  /* Layout */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-soft: 0 12px 30px rgba(10, 28, 66, 0.08);
  --shadow-float: 0 20px 50px rgba(0, 0, 0, 0.28);

  /* Gradient */
  --gradient-brand: linear-gradient(
    135deg,
    #126BFF 0%,
    #10DCD5 48%,
    #8756FF 100%
  );
}
```

---

## 11. Quick Design Checklist

Before publishing any AppVibe asset, verify:

- [ ] The AppVibe logo has sufficient contrast and clear space.
- [ ] The primary CTA is obvious within the first viewport.
- [ ] The page works at 360 px width without broken layouts.
- [ ] Text hierarchy is clear without relying on color alone.
- [ ] Accent colors support hierarchy rather than compete with each other.
- [ ] Cards have one clear purpose each.
- [ ] The design feels like a usable product, not only a visual mockup.
- [ ] Claims are specific and supportable.
- [ ] Product sub-brand personality does not weaken AppVibe parent recognition.
- [ ] Dark-mode visuals use the white AppVibe wordmark and vivid icon colors.

---

## 12. Asset Checklist

Recommended asset set to prepare:

```text
/brand
  /logo
    appvibe-logo-light.png
    appvibe-logo-dark.png
    appvibe-icon-light.png
    appvibe-icon-dark.png
    appvibe-logo-monochrome-dark.svg
    appvibe-logo-monochrome-light.svg

  /social
    appvibe-avatar-1024.png
    appvibe-og-cover-1200x630.png
    appvibe-linkedin-cover.png

  /favicon
    favicon.ico
    favicon-16x16.png
    favicon-32x32.png
    apple-touch-icon.png
    site.webmanifest
```

For production brand assets, rebuild the approved mark as **SVG vector artwork**. Generated raster logo visuals are useful as concept references, but should not be treated as the final source of truth for scaling, print, or trademark work.

---

## 13. Brand Summary

> **AppVibe makes digital products feel clear, useful, and ready to move.**

The visual system should always balance:

- **Structured systems** with **creative energy**
- **High-tech polish** with **human clarity**
- **Portfolio-level visual quality** with **real product usability**
- **A flexible ecosystem** with **one recognizable parent brand**
