# Green Hill Lombok

Private land and investment advisory platform for opportunities across Lombok.

Green Hill is built as a curated editorial experience — not a generic property marketplace. The site presents selected land and investment opportunities with a quiet-luxury visual language: forest green, ivory, restrained gold, Prata, and Jost.

**Repository:** [Firmanstmik/green-hill-lombok](https://github.com/Firmanstmik/green-hill-lombok)

---

## Stack

| Layer | Technology |
|--------|------------|
| App | React 18, TypeScript, Vite |
| UI | Tailwind CSS, Radix / shadcn patterns |
| Motion | Framer Motion |
| Backend | Supabase (auth, data, edge functions) |
| Maps | Mapbox (optional) |
| i18n | English, Indonesian, Dutch, Spanish |

---

## Getting started

### Requirements

- Node.js 20+ (recommended)
- npm

### Setup

```bash
git clone https://github.com/Firmanstmik/green-hill-lombok.git
cd green-hill-lombok
npm install
cp .env.example .env
```

Fill `.env` with your Supabase project values (and Mapbox token if needed):

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# VITE_MAPBOX_ACCESS_TOKEN=
```

### Develop

```bash
npm run dev
```

### Quality checks

```bash
npm test
npm run build
npx tsc --noEmit
```

### Preview production build

```bash
npm run build
npm run preview
```

---

## Project structure

```text
src/
  assets/greenhill/     Brand photography & logo masters
  components/
    brand/              Shared brand marks (e.g. curve signature)
    home/               Homepage sections (hero, founder, opportunities…)
    layout/             Navbar, footer, mobile nav
  contexts/             Language, currency, auth
  pages/                Routes
  lib/                  Supabase, i18n, helpers
supabase/               Migrations & edge functions
```

---

## Brand notes

- **Hero** — full-bleed masters, chapter navigation, restrained motion  
- **Founder** — editorial story with Green Hill signature mark  
- **Selected Opportunities** — curated catalogue (featured + editorial list), not marketplace cards  
- Gold is an accent; forest green carries the brand  

---

## Environment & secrets

- Never commit `.env` — it is gitignored  
- Use `.env.example` as the public template  
- Rotate keys if they were ever shared outside a secure channel  

---

## License

Private / proprietary unless otherwise stated by the repository owner.
