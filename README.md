# DrawOnPDF | Free Online Whiteboard & PDF Annotator for Teachers

[![Astro](https://img.shields.io/badge/Astro-5.0-BC52EE.svg?style=flat&logo=astro)](https://astro.build)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![SEO Score](https://img.shields.io/badge/SEO_Score-100%25-659287.svg?style=flat)](https://drawonpdf.github.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Support](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/kisharadilz)

An ultra-minimal, high-performance, 100% browser-based online whiteboard and PDF annotation tool. Built for online teachers, tutors, students, and remote educators.

🌐 **Production Website:** [https://drawonpdf.github.io](https://drawonpdf.github.io)  
☕ **Support Developer:** [buymeacoffee.com/kisharadilz](https://buymeacoffee.com/kisharadilz)

---

## 🎨 Theme & Visual Identity

The interface is styled with a modern, eye-friendly Sage & Mint color palette:
- **`#659287` (Deep Sage / Primary):** Brand logo, active tools, primary CTA buttons, and focus outlines.
- **`#88BDA4` (Medium Seafoam):** Hover states, logo gradients, and dark-mode accents.
- **`#B1D3B9` (Soft Mint):** Modern dot grid pattern, subtle card borders, and text selection highlights.
- **`#E6F2DD` (Ultra Light Mint):** Badge backgrounds, pill indicators, and subtle card backdrops.

---

## 🚀 Key Features

### 🖌️ Interactive Canvas & Board Modes
- **Full Device Screen Size:** Canvas expands edge-to-edge across 100% of the device viewport (`h-[calc(100dvh-64px)]` and `w-full h-full`), dynamically resizing on orientation and window changes.
- **4 Authentic Board Modes:**
  - ⬜ **Blank Whiteboard:** Crisp white canvas with modern `#B1D3B9` soft-mint dot grid.
  - ⬛ **Dark Slate:** Low-light chalkboard (`#1e1e1e`) for comfortable evening sessions.
  - 🟩 **Green Chalkboard:** Minimalist matte greenboard (`#275c46`) with sleek modern borders.
  - 📄 **Upload PDF:** Annotate multi-page PDF documents with instant page navigation.

### ✍️ Precision Drawing Tools
- **Anti-Aliased Freehand Pen:** 4 tip widths (`2px`, `6px`, `12px`, `24px`).
- **Translucent Highlighter:** Semi-transparent highlighter overlay that maintains crystal-clear PDF text legibility underneath.
- **Precision Eraser:** Targeted stroke deletion.
- **Pan / Move Tool:** Fluid canvas navigation and positioning.
- **Palette & Color Picker:** Preset brand colors plus full spectrum HTML5 custom color picker.
- **History Stack:** Stack-based Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), and Clear Page with confirmation.

### 📱 Responsive & Touch-Optimized
- **Apple Pencil & Stylus Friendly:** Implemented with native Pointer Events, `touch-action: none`, and `overscroll-behavior: none` to eliminate accidental browser scrolling or pull-to-refresh gestures while drawing.
- **Adaptive Floating Toolbar:** Auto-adjusts padding, button sizing, and icon dimensions across mobile (down to `320px`), tablets, iPads, and large 4K displays without viewport overflow.
- **Compact Mobile Navigation:** Responsive board mode switcher with swipeable touch scroll.

### 📑 Dual High-Res Export
- **Merged PDF Export (`jspdf`):** Automatically merges the original multi-page PDF with all drawing layers into a crisp, printable PDF download.
- **PNG Snapshot Export:** Downloads a high-resolution 2x Retina PNG image of the current page.

### 🔒 100% Client-Side Privacy
- **Zero Server Uploads:** PDF parsing (`pdfjs-dist`), stroke processing, and export rendering happen entirely inside the user's browser.
- **Local Web Worker:** `pdf.worker.min.js` is bundled locally from the root domain, eliminating external CDN dependencies, latency, and ad-blocker interference.

---

## 🌐 6-Language Subpath Routing (i18n)

Full bidirectional localization across 6 global languages with 100% zero-placeholder translation dictionaries:

| Language | Route | Hreflang Code |
| :--- | :--- | :--- |
| **English (Default)** | `/` | `en` (also `x-default`) |
| **Spanish (Español)** | `/es/` | `es` |
| **Portuguese (Português)** | `/pt/` | `pt` |
| **German (Deutsch)** | `/de/` | `de` |
| **French (Français)** | `/fr/` | `fr` |
| **Japanese (日本語)** | `/ja/` | `ja` |

---

## 🏆 Technical SEO Architecture (100% Score)

- **Open Graph & Twitter Cards:**
  - High-res Cloudinary banner (`1200x630` PNG): `https://res.cloudinary.com/dpx6w78bt/image/upload/f_auto/q_auto/v1786342039/Online_Tool_rc1ybr.png`
  - Preconnected delivery via `<link rel="preconnect" href="https://res.cloudinary.com" crossorigin />`.
- **Complete Schema.org JSON-LD Graph:**
  - `WebSite`
  - `Organization` (with `sameAs` developer support link)
  - `BreadcrumbList` (Home > Whiteboard hierarchy)
  - `WebApplication` (EducationalApplication, $0 USD Offer, FeatureList, Screenshots)
  - `HowTo` (3-step structured guide)
  - `FAQPage` (5 crawlable Q&A pairs matching on-page content)
- **Crawlability & Indexing:**
  - Absolute self-referencing canonical URLs on every locale.
  - 7 reciprocal bidirectional `hreflang` link tags per page.
  - Standard `sitemap.xml` with `xhtml:link` alternates and explicit `robots.txt`.
- **Accessibility & ARIA (WCAG 2.1 AAA):**
  - Accessible screen-reader `<h1>` on all routes.
  - `aria-haspopup="true"` and `aria-expanded` state tracking on Language, Export, Color, and Pen Size popovers.
- **Analytics:**
  - Google Analytics (`gtag.js`: `G-V90SQQNZBY`) integrated with inline initialization and performance preconnects.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Static Site Generator** | [Astro 5](https://astro.build) (SSG Mode) |
| **UI Island** | [React 18](https://react.dev) (`client:load`) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com) (Dark mode via `class`) |
| **PDF Rendering** | [PDF.js (pdfjs-dist)](https://mozilla.github.io/pdf.js/) (Local worker) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Hosting & CI/CD** | [GitHub Pages](https://pages.github.com) via GitHub Actions |

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### Setup & Commands

```bash
# 1. Clone the repository
git clone https://github.com/drawonpdf/drawonpdf.github.io.git
cd drawonpdf.github.io

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build static production bundle
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 🚀 Deployment

The project deploys automatically to GitHub Pages using the included workflow at `.github/workflows/deploy.yml` on every push to `main`.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
