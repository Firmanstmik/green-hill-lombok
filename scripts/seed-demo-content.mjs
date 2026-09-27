/**
 * Reversible Green Hill client-review dataset.
 *
 * Inserts or updates four DEMO- opportunities and four demo- notes.
 * Does not touch other records, users, auth, or grants.
 *
 * Writes through the linked Supabase CLI session. The service role cannot
 * insert these rows: production grants withhold table DML from service_role.
 * Do not put SUPABASE_SERVICE_ROLE_KEY in Vite, the frontend, or git.
 *
 *   node scripts/seed-demo-content.mjs
 *   node scripts/seed-demo-content.mjs --remove
 */
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, '');
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const remove = process.argv.includes('--remove');

function doc(text) {
  return {
    type: 'doc',
    content: text.split(/\n\n+/).map((paragraph) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph.trim() }],
    })),
  };
}

const SAMPLE =
  'This is demonstration content created for client review. It is not a real Green Hill listing. Replace every illustrative value with confirmed property information before publication.';

const WHY =
  'Sample editorial content demonstrating the intended Green Hill approach. Replace this text with a verified, property-specific perspective before launch.';

const VERIFY =
  'DEMO CONTENT — NOT VERIFIED. Internal notes are not shown publicly. Replace land size, tenure, zoning, access and price with confirmed information before publication.';

function opportunity(input) {
  const images = input.images;
  const alt = Object.fromEntries(images.map((src, index) => [src, input.alts[index]]));
  return {
    title: input.title,
    slug: input.slug,
    listing_code: input.reference,
    type: 'Land',
    property_type: 'Land',
    status: input.status,
    visibility: input.visibility,
    featured: input.featured,
    summary: `${input.summary} ${SAMPLE}`,
    region: 'South Lombok',
    area: input.area,
    address: input.location,
    formatted_address: input.location,
    latitude: input.lat,
    longitude: input.lng,
    land_size: input.landSize,
    m2: input.landSize,
    surface_area: input.surface,
    bedrooms: 0,
    bathrooms: 0,
    ownership: null,
    zoning: null,
    development_status: 'Undeveloped land',
    description: null,
    description_json: doc(`${SAMPLE}\n\n${input.body}`),
    why_green_hill: WHY,
    verification_notes: VERIFY,
    images,
    image_url: images[0],
    image_alt: alt,
    og_image: images[0],
    video_url: null,
    brochure_url: null,
    masterplan_url: null,
    memorandum_url: null,
    private_teaser: input.privateTeaser,
    disclosure: input.disclosure,
    price_on_request: true,
    price_amount: null,
    price_currency: 'IDR',
    price_display: 'exact',
    price_amount_max: null,
    price: 0,
    price_type: 'sale',
    features: {
      Status: input.statusLabel,
      Type: 'Land',
      ...(input.visibility === 'private' ? { Private: 'true' } : {}),
    },
    seo_title: `${input.title} · Sample opportunity · Green Hill`,
    seo_description: `Sample opportunity for client review. ${input.summary} Not a verified listing.`,
    published_at: new Date().toISOString(),
  };
}

const opportunities = [
  opportunity({
    reference: 'DEMO-001',
    slug: 'demo-south-lombok-coastal-land',
    title: 'South Lombok Coastal Land',
    status: 'available',
    statusLabel: 'Available',
    visibility: 'public',
    featured: true,
    privateTeaser: false,
    disclosure: {},
    area: 'Coastal — sample location',
    location: 'South Lombok — sample location',
    landSize: 2450,
    surface: '2,450 m² — sample value',
    lat: -8.89,
    lng: 116.28,
    summary: 'A featured sample showing how a coastal parcel can lead the collection.',
    body: 'The photograph and the layout are real Green Hill material. The parcel, size and coordinates are illustrative and must not be treated as a property for sale.',
    images: ['https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coastal.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coast-wide.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/beach.webp'],
    alts: [
      'Sample coastal land photograph, South Lombok',
      'Sample wider coastal view used for the demonstration gallery',
      'Sample shoreline photograph used for the demonstration gallery',
    ],
  }),
  opportunity({
    reference: 'DEMO-002',
    slug: 'demo-are-guling-valley-land',
    title: 'Are Guling Valley Land',
    status: 'available',
    statusLabel: 'Available',
    visibility: 'public',
    featured: false,
    privateTeaser: false,
    disclosure: {},
    area: 'Valley — sample location',
    location: 'Are Guling — sample location',
    landSize: 1250,
    surface: '1,250 m² — sample value',
    lat: -8.91,
    lng: 116.32,
    summary: 'A standard sample card for a valley holding in the curated collection.',
    body: 'Use this record to try editing a normal available opportunity: title, summary, gallery and publish state.',
    images: ['https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/valley.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/hillside.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coast-wide.webp'],
    alts: [
      'Sample valley land photograph',
      'Sample hillside photograph in the demonstration gallery',
      'Sample coastal context photograph in the demonstration gallery',
    ],
  }),
  opportunity({
    reference: 'DEMO-003',
    slug: 'demo-south-coast-hillside-land',
    title: 'South Coast Hillside Land',
    status: 'reserved',
    statusLabel: 'Reserved',
    visibility: 'public',
    featured: false,
    privateTeaser: false,
    disclosure: {},
    area: 'Hillside — sample location',
    location: 'South coast — sample location',
    landSize: 800,
    surface: '800 m² — sample value',
    lat: -8.93,
    lng: 116.35,
    summary: 'A reserved sample, shown with the existing quiet status treatment.',
    body: 'Reserved here means the demonstration record uses that status. It does not mean a real parcel has been reserved.',
    images: ['https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/hillside.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/valley.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coastal.webp'],
    alts: [
      'Sample hillside land photograph',
      'Sample valley photograph in the demonstration gallery',
      'Sample coastal photograph in the demonstration gallery',
    ],
  }),
  opportunity({
    reference: 'DEMO-004',
    slug: 'demo-lombok-private-land',
    title: 'Lombok Private Land Opportunity',
    status: 'available',
    statusLabel: 'Available',
    visibility: 'private',
    featured: false,
    privateTeaser: true,
    disclosure: { location: true },
    area: 'Private — sample location',
    location: 'South Lombok — sample location, not disclosed in full',
    landSize: 5000,
    surface: '5,000 m² — sample value',
    lat: null,
    lng: null,
    summary: 'A private sample teaser. Exact place and price stay off the public page.',
    body: 'This record shows a discreet teaser. Map coordinates are intentionally empty. Only the region is disclosed.',
    images: ['https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/beach.webp', 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coastal.webp'],
    alts: ['Sample private-teaser photograph', 'Sample coastal context for the private demonstration'],
  }),
];

function note(input) {
  const section = (heading, content) => ({ heading, content });
  return {
    slug: input.slug,
    status: 'published',
    topic: input.topic,
    published_on: input.date,
    author: 'Green Hill',
    featured: input.featured,
    cover_image: input.cover,
    cover_alt: input.alt,
    og_image: input.cover,
    translations: {
      en: {
        title: input.title,
        excerpt: input.excerpt,
        seoTitle: `${input.title} · Sample note · Green Hill`,
        seoDescription: `Sample note for client review. ${input.excerpt}`,
        sections: input.sections.map(([heading, content]) => section(heading, content)),
      },
    },
  };
}

const notes = [
  note({
    slug: 'demo-why-south-lombok',
    topic: 'lombok',
    date: '2026-09-01',
    featured: true,
    cover: 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/coast-wide.webp',
    alt: 'Sample cover, South Lombok coast',
    title: 'Why South Lombok Continues to Attract Attention',
    excerpt: 'A sample note on how Green Hill talks about place before talking about a parcel.',
    sections: [
      ['Place first', 'People ask about South Lombok because the coast, the scale of the land and the pace of the south feel different from a crowded market. This note is a demonstration of that kind of writing. It is not a market report.'],
      ['What we do not claim', 'Price is only one part of how an opportunity is read. Location, access, tenure and the character of the surrounding area all matter. No figure in this note should be treated as a verified statistic.'],
    ],
  }),
  note({
    slug: 'demo-what-we-look-for',
    topic: 'land',
    date: '2026-09-08',
    featured: false,
    cover: 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/valley.webp',
    alt: 'Sample cover, valley land',
    title: 'What We Look For When Assessing Land',
    excerpt: 'A sample note on the questions Green Hill asks before a parcel is presented.',
    sections: [
      ['A short list', 'We look at how the land sits, how it is reached, what is already around it, and whether the tenure story is clear enough to discuss. Those are considerations, not a checklist of verified facts for any particular site.'],
      ['Replace this', 'When a real note is ready, this demonstration article should be archived and replaced with writing Reece is willing to stand behind.'],
    ],
  }),
  note({
    slug: 'demo-buying-land-questions',
    topic: 'buying',
    date: '2026-09-15',
    featured: false,
    cover: 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/hillside.webp',
    alt: 'Sample cover, hillside land',
    title: 'Buying Land in Lombok: The Questions We Ask First',
    excerpt: 'A sample note on the first questions, without pretending they have already been answered.',
    sections: [
      ['Before a decision', 'Who is selling, what form of tenure is being discussed, what still needs a local check, and whether the land matches what the buyer actually wants to do. Those questions come before any conversation about price.'],
      ['Not advice', 'This demonstration does not describe a real transaction and it is not legal, tax or investment advice.'],
    ],
  }),
  note({
    slug: 'demo-first-conversation',
    topic: 'perspective',
    date: '2026-09-20',
    featured: false,
    cover: 'https://aotudcdebpeomyjcirtr.supabase.co/storage/v1/object/public/site-media/demo/beach.webp',
    alt: 'Sample cover, shoreline',
    title: 'From First Conversation to Site Visit',
    excerpt: 'A sample note on how a conversation with Green Hill can move toward a visit, without promising an outcome.',
    sections: [
      ['The shape of it', 'A first conversation is about what someone is considering and what would make a visit worthwhile. A site visit, when it happens, is a chance to see the land in context. Nothing in that sequence guarantees a purchase.'],
      ['Demonstration only', 'Archive this note when real editorial is ready. The photographs are Green Hill images. The article is sample writing for the CMS review.'],
    ],
  }),
];

const QUOTE = 'ghdemo';

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'object') return `$${QUOTE}$${JSON.stringify(value)}$${QUOTE}$::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

const PROPERTY_COLUMNS = [
  'title', 'slug', 'listing_code', 'type', 'property_type', 'status', 'visibility', 'featured',
  'summary', 'region', 'area', 'address', 'formatted_address', 'latitude', 'longitude',
  'land_size', 'm2', 'surface_area', 'bedrooms', 'bathrooms', 'ownership', 'zoning',
  'development_status', 'description', 'description_json', 'why_green_hill', 'verification_notes',
  'images', 'image_url', 'image_alt', 'og_image', 'video_url', 'brochure_url', 'masterplan_url',
  'memorandum_url', 'private_teaser', 'disclosure', 'price_on_request', 'price_amount',
  'price_currency', 'price_display', 'price_amount_max', 'price', 'price_type', 'features',
  'seo_title', 'seo_description', 'published_at',
];

const NOTE_COLUMNS = [
  'slug', 'status', 'topic', 'published_on', 'author', 'featured',
  'cover_image', 'cover_alt', 'og_image', 'translations',
];

function assignments(row, columns) {
  return columns.map((column) => `${column} = ${sqlValue(row[column])}`).join(',\n    ');
}

function insertIfMissing(table, row, columns, guard) {
  return `INSERT INTO public.${table} (${columns.join(', ')})
SELECT ${columns.map((column) => sqlValue(row[column])).join(', ')}
WHERE NOT EXISTS (${guard});`;
}

function buildSql() {
  if (remove) {
    return `BEGIN;
DELETE FROM public.properties WHERE listing_code LIKE 'DEMO-%';
DELETE FROM public.notes WHERE slug LIKE 'demo-%';
COMMIT;`;
  }

  const statements = ['BEGIN;'];
  for (const row of opportunities) {
    if (!String(row.listing_code).startsWith('DEMO-')) throw new Error('Refusing a non-demo opportunity.');
    statements.push(
      `UPDATE public.properties SET
    ${assignments(row, PROPERTY_COLUMNS)}
  WHERE listing_code = ${sqlValue(row.listing_code)};`,
      insertIfMissing(
        'properties',
        row,
        PROPERTY_COLUMNS,
        `SELECT 1 FROM public.properties WHERE listing_code = ${sqlValue(row.listing_code)}`,
      ),
    );
  }
  for (const row of notes) {
    if (!String(row.slug).startsWith('demo-')) throw new Error('Refusing a non-demo note.');
    statements.push(`INSERT INTO public.notes (${NOTE_COLUMNS.join(', ')})
VALUES (${NOTE_COLUMNS.map((column) => sqlValue(row[column])).join(', ')})
ON CONFLICT (slug) DO UPDATE SET
    ${assignments(row, NOTE_COLUMNS.filter((column) => column !== 'slug'))}
  WHERE public.notes.slug LIKE 'demo-%';`);
  }
  statements.push('COMMIT;');
  return statements.join('\n');
}

function runLinkedSql(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'gh-seed-'));
  const file = join(dir, 'seed.sql');
  writeFileSync(file, sql, 'utf8');
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--linked', '--file', file, '--output-format', 'json'],
    { encoding: 'utf8', shell: true },
  );
  rmSync(dir, { recursive: true, force: true });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    const safe = output.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
    throw new Error(safe.slice(0, 1200));
  }
}

runLinkedSql(buildSql());
if (remove) {
  console.log('Removed DEMO- opportunities and demo- notes.');
} else {
  for (const row of opportunities) console.log(`upserted ${row.listing_code} ${row.title}`);
  for (const row of notes) console.log(`upserted ${row.slug}`);
  console.log('Demo dataset ready. Remove later with --remove. That command only deletes DEMO- and demo- rows.');
}
