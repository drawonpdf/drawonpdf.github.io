# DrawOnPDF | Free Online Whiteboard & PDF Annotator

An ultra-minimal, high-performance, 100% browser-based online whiteboard and PDF annotation tool designed for online teachers, tutors, and students.

🌐 **Website:** [https://drawonpdf.github.io](https://drawonpdf.github.io)  
☕ **Support the Developer:** [buymeacoffee.com/kisharadilz](https://buymeacoffee.com/kisharadilz)

---

## Key Features

- **100% Client-Side Privacy:** Zero server uploads. All PDF parsing, drawing strokes, and export rendering execute inside the local browser.
- **Board Modes:**
  - ⬜ **Whiteboard:** Crisp, modern whiteboard with subtle dot grid.
  - ⬛ **Dark Slate:** Eye-friendly chalkboard for low-light presentations.
  - 🟩 **Green Chalkboard:** Vintage classroom greenboard with tactile wooden frame.
  - 📄 **Upload PDF:** Annotate multi-page PDF documents.
- **Drawing Tools:**
  - ✏️ Smooth Freehand Pen (Thin, Medium, Thick, Extra Thick)
  - 🖍️ Translucent Highlighter (preserves PDF text legibility)
  - 🧽 Precision Eraser
  - ✋ Pan / Hand Tool & Zoom Controls (50% – 300%)
  - 🎨 Preset colors + Custom Color Picker
  - ↩️ Undo / Redo & Clear Page
- **Multi-Page Support:** Preserves independent drawing strokes across every page of uploaded PDFs.
- **Export Options:**
  - 📑 Export as merged multi-page PDF via `jspdf`.
  - 🖼️ Download as high-resolution PNG image.
- **6-Language i18n Subpath Routing:**
  - 🇬🇧 English (`/`)
  - 🇪🇸 Spanish (`/es/`)
  - 🇧🇷 / 🇵🇹 Portuguese (`/pt/`)
  - 🇩🇪 German (`/de/`)
  - 🇫🇷 French (`/fr/`)
  - 🇯🇵 Japanese (`/ja/`)
- **Technical SEO & Performance:**
  - Anti-FOUC theme detector script for instant dark/light persistence.
  - 7 bidirectional hreflang tags including `x-default`.
  - Comprehensive Schema.org JSON-LD (`WebApplication`, `HowTo`, `FAQPage`).
  - Automated GitHub Pages CI/CD workflow.

---

## Tech Stack

- **Framework:** Astro 5 (Static Site Generation mode)
- **UI Island:** React 18
- **Styling:** Tailwind CSS (`darkMode: 'class'`)
- **PDF Engine:** `pdfjs-dist`
- **PDF Export:** `jspdf`
- **Icons:** `lucide-react`

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production static site
npm run build

# Preview production build
npm run preview
```

---

## License

MIT
