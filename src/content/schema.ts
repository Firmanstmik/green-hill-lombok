/**
 * Green Hill content model (Phase 7A).
 *
 * This is NOT a page builder. Each page below is a fixed Green Hill concept
 * with fixed sections; the layout stays in code. Reece edits the words and
 * the images, never the structure.
 *
 * Field keys are the site's own copy keys (src/lib/i18n/translations). When a
 * field has never been edited, the approved copy that ships with the site is
 * shown. Keys that start with `cms.` have no shipped copy: they only appear
 * on the site once Reece fills them in (for example extra Buying topics).
 */

export const CONTENT_LOCALES = ['en', 'id', 'nl', 'es'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
export const LOCALE_LABEL: Record<ContentLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  nl: 'Dutch',
  es: 'Spanish',
};

export type PageKey =
  | 'home'
  | 'about'
  | 'whyLombok'
  | 'buying'
  | 'private'
  | 'opportunities'
  | 'notes'
  | 'enquire'
  | 'site'
  | 'seo';

export type FieldKind = 'line' | 'text' | 'email' | 'phone' | 'url' | 'number';

export type FieldDef = {
  key: string;
  label: string;
  help?: string;
  kind: FieldKind;
  /** The same value in every language (contact details, numbers). */
  shared?: boolean;
  /** Must have a value before the page can be published. */
  required?: boolean;
  /** Text uses "|" to start a new line in the design. */
  lines?: boolean;
  max?: number;
  min?: number;
};

export type MediaDef = {
  slot: string;
  label: string;
  help?: string;
  /** Offer a focal point (which part of the photo stays in view). */
  focal?: boolean;
  /** Key of the localized field holding the image description. */
  altKey?: string;
};

export type SectionDef = { id: string; title: string; lead?: string; fields: FieldDef[]; media?: MediaDef[] };

export type PageDef = {
  key: PageKey;
  title: string;
  summary: string;
  /** Public path after /:lang, used for preview. Null for settings pages. */
  path: string | null;
  group: 'content' | 'settings';
  sections: SectionDef[];
};

const line = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: 'line', ...extra });
const text = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: 'text', ...extra });
const title = (key: string, label = 'Heading'): FieldDef => text(key, label, { lines: true, max: 160 });
/** Repeated items (cards, steps): a title and a text for each. */
const items = (prefix: string, keys: readonly (readonly [string, string])[], titleField = 'title', bodyField = 'body'): FieldDef[] =>
  keys.flatMap(([key, name]) => [
    line(`${prefix}.${key}.${titleField}`, name),
    text(`${prefix}.${key}.${bodyField}`, `${name}: text`),
  ]);

const seoSection = (titleKey: string, descriptionKey: string, imageSlot: string): SectionDef => ({
  id: 'seo',
  title: 'Search & sharing',
  lead: 'How this page appears on Google and when shared on WhatsApp or social media.',
  fields: [
    line(titleKey, 'Title in search results', { help: 'Around 60 characters shows in full.', max: 90 }),
    text(descriptionKey, 'Description in search results', { help: 'One or two plain sentences, around 155 characters.', max: 300 }),
  ],
  media: [{ slot: imageSlot, label: 'Sharing image', help: 'Shown when the page is shared. Landscape photographs work best.' }],
});

export const PAGES: PageDef[] = [
  {
    key: 'home',
    title: 'Homepage',
    summary: 'Hero, Reece’s introduction, selected opportunities, Green Hill Private, trust and the closing invitation.',
    path: '',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Hero',
        lead: 'The first thing every visitor sees.',
        fields: [
          line('hero.locationLabel', 'Small label above the headline'),
          title('hero.headline', 'Headline'),
          title('hero.headlineMobile', 'Headline on phones'),
          line('hero.subheadline', 'Supporting line', { required: true }),
          line('hero.exploreOpportunities', 'Main button'),
          line('hero.speakWithUs', 'Second button'),
          text('hero.founderNote', 'Reece’s note beside the hero'),
          line('hero.meetReece', 'Link to Reece’s story'),
          line('hero.founderName', 'Name beside the hero'),
          line('hero.founderRole', 'Role beside the hero'),
          line('cms.home.hero.slide1.title', 'Chapter 1 name'),
          line('cms.home.hero.slide2.title', 'Chapter 2 name'),
          line('cms.home.hero.slide3.title', 'Chapter 3 name'),
        ],
        media: [
          { slot: 'home.hero.slide1', label: 'Hero photograph 1', focal: true, altKey: 'cms.home.hero.slide1.alt' },
          { slot: 'home.hero.slide2', label: 'Hero photograph 2', focal: true, altKey: 'cms.home.hero.slide2.alt' },
          { slot: 'home.hero.slide3', label: 'Hero photograph 3', focal: true, altKey: 'cms.home.hero.slide3.alt' },
        ],
      },
      {
        id: 'founder',
        title: 'Reece’s introduction',
        fields: [
          line('founder.eyebrow', 'Small label'),
          title('founder.headline'),
          text('founder.story1', 'Story, paragraph 1'),
          text('founder.story2', 'Story, paragraph 2'),
          text('founder.story3', 'Story, paragraph 3'),
          text('founder.story4', 'Story, paragraph 4'),
          text('founder.quote', 'Quote', { lines: true }),
          line('founder.name', 'Name'),
          line('founder.role', 'Role'),
        ],
        media: [{ slot: 'home.founder.portrait', label: 'Reece’s photograph', altKey: 'cms.home.founder.portrait.alt' }],
      },
      {
        id: 'selected',
        title: 'Selected opportunities',
        lead: 'Which opportunities appear is decided by “Featured” in Opportunities.',
        fields: [
          line('selected.eyebrow', 'Small label'),
          title('selected.headline'),
          text('selected.lead', 'Introduction'),
          line('selected.viewAll', 'Link to all opportunities'),
          text('selected.empty', 'Text while no opportunity is published'),
          {
            key: 'cms.home.selected.count',
            label: 'How many opportunities to show',
            kind: 'number',
            shared: true,
            min: 3,
            max: 6,
            help: 'Between 3 and 6, as in the brief. Featured opportunities are shown first.',
          },
        ],
      },
      {
        id: 'private',
        title: 'Green Hill Private teaser',
        fields: [
          line('private.eyebrow', 'Small label'),
          title('private.headline'),
          text('private.lead', 'Introduction'),
          line('private.cta', 'Button'),
          line('private.journey', 'Link'),
          text('private.note', 'Small note'),
          ...items('private.pathways', [
            ['land', 'Pathway 1'],
            ['hospitality', 'Pathway 2'],
            ['development', 'Pathway 3'],
            ['joint', 'Pathway 4'],
          ]),
        ],
        media: [{ slot: 'home.private.card', label: 'Photograph', altKey: 'cms.home.private.card.alt' }],
      },
      {
        id: 'trust',
        title: 'Why Lombok & buying',
        fields: [
          line('trust.eyebrow', 'Small label'),
          title('trust.headline'),
          text('trust.lead', 'Introduction'),
          line('trust.cta', 'Button'),
          line('trust.placeLabel', 'Place: small label'),
          ...items('trust.place', [
            ['south', 'Place card 1'],
            ['access', 'Place card 2'],
            ['lifestyle', 'Place card 3'],
            ['perspective', 'Place card 4'],
          ]),
          text('trust.buyingLead', 'Buying: introduction'),
          text('trust.buying.ownership.body', 'Buying card 1: short text (the title is edited on Buying in Lombok)'),
          text('trust.buying.dueDiligence.body', 'Buying card 2: short text'),
          text('trust.buying.zoning.body', 'Buying card 3: short text'),
          text('trust.buying.process.body', 'Buying card 4: short text'),
        ],
        media: [{ slot: 'home.trust.photo', label: 'Photograph', altKey: 'cms.home.trust.photo.alt' }],
      },
      {
        id: 'final',
        title: 'Closing invitation',
        fields: [
          line('final.eyebrow', 'Small label'),
          title('final.headline'),
          text('final.lead', 'Supporting text'),
          line('final.primaryCta', 'Main button (opens WhatsApp)'),
          line('final.secondaryCta', 'Second button'),
          line('final.profileCta', 'Link to the investor enquiry'),
          ...items('final.steps', [
            ['start', 'Step 1'],
            ['discuss', 'Step 2'],
            ['explore', 'Step 3'],
          ]),
        ],
        media: [
          { slot: 'home.final.photo', label: 'Main photograph', altKey: 'cms.home.final.photo.alt' },
          { slot: 'home.final.photo2', label: 'Second photograph', altKey: 'cms.home.final.photo2.alt' },
          { slot: 'home.final.photo3', label: 'Third photograph', altKey: 'cms.home.final.photo3.alt' },
        ],
      },
      seoSection('cms.home.seo.title', 'cms.home.seo.description', 'home.seo.image'),
    ],
  },
  {
    key: 'about',
    title: 'About / Reece',
    summary: 'Reece’s story, the place, relationships and the Green Hill way of working.',
    path: '/about',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Introduction',
        fields: [
          line('about.page.hero.eyebrow', 'Small label'),
          text('about.page.hero.headline', 'Headline', {
            max: 160,
            help: 'Use | for a new line. Start a line with ~ for the strong tone or . for the quiet tone; wrap a line in *stars* for gold.',
          }),
          text('about.page.hero.lead', 'Introduction'),
          line('about.page.hero.imageAlt', 'Portrait description (for screen readers)'),
          ...items('about.page.hero.cards', [
            ['ground', 'Card 1'],
            ['selective', 'Card 2'],
            ['relationship', 'Card 3'],
          ]),
          line('about.page.hero.captionName', 'Photo caption: name'),
          line('about.page.hero.captionRole', 'Photo caption: role'),
        ],
        media: [
          {
            slot: 'about.hero.background',
            label: 'Background photograph',
            help: 'Behind Reece’s cut-out portrait. The portrait itself is a prepared transparent image and stays as designed.',
          },
        ],
      },
      {
        id: 'story',
        title: 'The story',
        fields: [
          line('about.page.story.eyebrow', 'Small label'),
          title('about.page.story.title'),
          text('about.page.story.p1', 'Paragraph 1'),
          text('about.page.story.p2', 'Paragraph 2'),
          text('about.page.story.p3', 'Paragraph 3'),
          text('about.page.story.pull', 'Quote', { lines: true }),
          line('about.page.story.cardLabel', 'Photo card: label'),
          line('about.page.story.cardNote', 'Photo card: note'),
        ],
        media: [{ slot: 'about.story.photo', label: 'Photograph', altKey: 'about.page.story.imageAlt' }],
      },
      {
        id: 'place',
        title: 'The place (Are Guling)',
        fields: [
          line('about.page.place.eyebrow', 'Small label'),
          title('about.page.place.title'),
          text('about.page.place.body', 'Text'),
          line('about.page.place.location', 'Place name'),
          line('about.page.place.region', 'Region'),
          line('about.page.place.link', 'Link to Why Lombok'),
        ],
        media: [{ slot: 'about.place.photo', label: 'Photograph', altKey: 'about.page.place.imageAlt' }],
      },
      {
        id: 'relations',
        title: 'Relationships',
        fields: [
          line('about.page.relations.eyebrow', 'Small label'),
          title('about.page.relations.title'),
          text('about.page.relations.body', 'Text'),
          text('about.page.relations.cards.landowners', 'Landowners'),
          text('about.page.relations.cards.developers', 'Developers'),
          text('about.page.relations.cards.notaries', 'Notaries'),
          text('about.page.relations.cards.professionals', 'Local professionals'),
          ...(
            [
              ['landowners', 'Landowners'],
              ['developers', 'Developers'],
              ['notaries', 'Notaries'],
              ['professionals', 'Local professionals'],
            ] as const
          ).flatMap(([key, name]) => [
            line(`about.page.relations.labels.${key}`, `${name}: name`),
            text(`about.page.relations.prefills.${key}`, `${name}: WhatsApp message`, {
              help: 'Pre-filled when a visitor opens this door on WhatsApp.',
              max: 300,
            }),
          ]),
          line('about.page.relations.cardAction', 'Card link'),
          text('about.page.relations.doorNote', 'Note under the relationships'),
          line('about.page.relations.doorCta', 'Button'),
        ],
      },
      {
        id: 'approach',
        title: 'How Green Hill works',
        fields: [
          line('about.page.approach.eyebrow', 'Small label'),
          title('about.page.approach.title'),
          text('about.page.approach.lead', 'Introduction'),
          line('about.page.approach.items.ground.title', 'Principle 1'),
          text('about.page.approach.items.ground.body', 'Principle 1 text'),
          line('about.page.approach.items.selective.title', 'Principle 2'),
          text('about.page.approach.items.selective.body', 'Principle 2 text'),
          line('about.page.approach.items.relationship.title', 'Principle 3'),
          text('about.page.approach.items.relationship.body', 'Principle 3 text'),
          line('about.page.approach.items.longTerm.title', 'Principle 4'),
          text('about.page.approach.items.longTerm.body', 'Principle 4 text'),
          line('about.page.approach.titleAccent', 'Heading: gold words'),
          line('about.page.approach.featureAlt', 'Main photograph description'),
        ],
        media: [
          { slot: 'about.approach.feature', label: 'Main photograph', help: 'Also shown for the Developers relationship.' },
          { slot: 'about.approach.ground', label: 'Principle 1 photograph', help: 'Also shown for Local professionals.' },
          { slot: 'about.approach.selective', label: 'Principle 2 photograph' },
          { slot: 'about.approach.longTerm', label: 'Principle 4 photograph', help: 'Principle 3 uses the story photograph.' },
        ],
      },
      {
        id: 'selects',
        title: 'What Green Hill selects',
        fields: [
          line('about.page.selects.eyebrow', 'Small label'),
          title('about.page.selects.title'),
          text('about.page.selects.body', 'Text'),
          ...items('about.page.selects.items', [
            ['land', 'Item 1'],
            ['villas', 'Item 2'],
            ['development', 'Item 3'],
            ['private', 'Item 4'],
          ]),
          line('about.page.selects.action', 'Item link'),
        ],
      },
      {
        id: 'ground',
        title: 'On the ground',
        fields: [
          line('about.page.ground.eyebrow', 'Small label'),
          title('about.page.ground.title'),
          text('about.page.ground.body', 'Text'),
          line('about.page.ground.captionName', 'Photo caption: name'),
          line('about.page.ground.captionRole', 'Photo caption: role'),
          line('about.page.ground.badgeValue', 'Badge: word'),
          line('about.page.ground.badgeLabel', 'Badge: label'),
          line('about.page.ground.offer', 'Points: small label'),
          ...items('about.page.ground.points', [
            ['visited', 'Point 1'],
            ['selective', 'Point 2'],
            ['relationships', 'Point 3'],
            ['personal', 'Point 4'],
          ]),
          line('about.page.ground.cta', 'Button'),
          line('about.page.ground.insetAlt', 'Small inset photograph description (the inset is the place photograph)'),
        ],
        media: [{ slot: 'about.ground.photo', label: 'Photograph', altKey: 'about.page.ground.imageAlt' }],
      },
      {
        id: 'final',
        title: 'Closing invitation',
        fields: [
          line('about.page.final.eyebrow', 'Small label'),
          title('about.page.final.title'),
          text('about.page.final.lead', 'Supporting text'),
          line('about.page.talk', 'Talk button'),
          line('about.page.explore', 'Explore button'),
        ],
      },
      {
        id: 'converse',
        title: 'Start a conversation',
        fields: [
          line('about.page.converse.eyebrow', 'Small label'),
          title('about.page.converse.title'),
          text('about.page.converse.body', 'Text'),
        ],
      },
      seoSection('about.page.seoTitle', 'about.page.seoDescription', 'about.seo.image'),
    ],
  },
  {
    key: 'whyLombok',
    title: 'Why Lombok',
    summary: 'Why Reece chose South Lombok: place, access, pace of life and the longer view. Educational, never promises.',
    path: '/why-lombok',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Introduction',
        fields: [line('whyLombok.page.eyebrow', 'Small label'), title('whyLombok.page.headline'), text('whyLombok.page.lead', 'Introduction')],
        media: [{ slot: 'why.hero', label: 'Main photograph', altKey: 'whyLombok.page.heroAlt' }],
      },
      {
        id: 'place',
        title: 'The place',
        fields: [
          line('whyLombok.page.place.eyebrow', 'Small label'),
          title('whyLombok.page.place.title'),
          text('whyLombok.page.place.body', 'Text'),
          line('whyLombok.page.place.cardTitle', 'Gallery caption'),
          line('whyLombok.page.place.location', 'Gallery place name'),
        ],
        media: [
          { slot: 'why.place', label: 'Gallery photograph 1', altKey: 'whyLombok.page.place.imageAlt' },
          { slot: 'why.place.slide2', label: 'Gallery photograph 2' },
          { slot: 'why.place.slide3', label: 'Gallery photograph 3' },
          { slot: 'why.place.slide4', label: 'Gallery photograph 4' },
        ],
      },
      {
        id: 'south',
        title: 'South Lombok & its development',
        lead: 'Mandalika, infrastructure and development quality belong here. Describe them; do not quote figures you cannot source.',
        fields: [
          line('whyLombok.page.south.eyebrow', 'Small label'),
          title('whyLombok.page.south.title'),
          text('whyLombok.page.south.body', 'Text'),
          line('whyLombok.page.south.labels.land', 'Label 1'),
          line('whyLombok.page.south.labels.coast', 'Label 2'),
          line('whyLombok.page.south.labels.access', 'Label 3'),
          line('whyLombok.page.south.labels.lifestyle', 'Label 4'),
        ],
        media: [{ slot: 'why.south', label: 'Photograph', altKey: 'whyLombok.page.south.imageAlt' }],
      },
      {
        id: 'access',
        title: 'Access & the airport',
        fields: [
          line('whyLombok.page.access.eyebrow', 'Small label'),
          title('whyLombok.page.access.title'),
          text('whyLombok.page.access.body', 'Text'),
          line('whyLombok.page.access.cardTitle', 'Gallery caption'),
          line('whyLombok.page.access.aside', 'Gallery note'),
        ],
        media: [
          { slot: 'why.access', label: 'Gallery photograph 1', altKey: 'whyLombok.page.access.imageAlt' },
          { slot: 'why.access.slide2', label: 'Gallery photograph 2' },
          { slot: 'why.access.slide4', label: 'Gallery photograph 4', help: 'Photograph 3 is the South Lombok photograph above.' },
        ],
      },
      {
        id: 'pace',
        title: 'Beaches, surf & lifestyle',
        fields: [line('whyLombok.page.pace.eyebrow', 'Small label'), title('whyLombok.page.pace.title'), text('whyLombok.page.pace.body', 'Text')],
        media: [{ slot: 'why.pace', label: 'Photograph', altKey: 'whyLombok.page.pace.imageAlt' }],
      },
      {
        id: 'longer',
        title: 'The longer view',
        fields: [
          line('whyLombok.page.longer.eyebrow', 'Small label'),
          title('whyLombok.page.longer.title'),
          text('whyLombok.page.longer.body', 'Text'),
          line('whyLombok.page.longer.aside', 'Side note'),
        ],
        media: [{ slot: 'why.longer', label: 'Photograph', altKey: 'whyLombok.page.longer.imageAlt' }],
      },
      {
        id: 'ground',
        title: 'From the ground',
        lead: 'Reece’s portrait here is the one set in Site settings.',
        fields: [
          line('whyLombok.page.ground.eyebrow', 'Small label'),
          title('whyLombok.page.ground.title'),
          text('whyLombok.page.ground.body', 'Text'),
          text('whyLombok.page.ground.note', 'Quote'),
          line('whyLombok.page.ground.attr', 'Quote attribution'),
          line('whyLombok.page.ground.imageAlt', 'Portrait description'),
        ],
      },
      {
        id: 'final',
        title: 'Closing & disclaimer',
        fields: [
          line('whyLombok.page.final.eyebrow', 'Small label'),
          title('whyLombok.page.final.title'),
          text('whyLombok.page.final.lead', 'Supporting text'),
          text('whyLombok.page.disclaimer', 'Educational disclaimer', {
            required: true,
            help: 'Keep it: this page is educational, not legal, tax or investment advice.',
          }),
          line('whyLombok.page.talk', 'Talk button'),
          line('whyLombok.page.explore', 'Explore button'),
          line('whyLombok.page.buying', 'Link to Buying in Lombok'),
        ],
      },
      seoSection('whyLombok.page.seoTitle', 'whyLombok.page.seoDescription', 'why.seo.image'),
    ],
  },
  {
    key: 'buying',
    title: 'Buying in Lombok',
    summary: 'Plain-English guidance on ownership, due diligence and the buying process. Educational, not legal advice.',
    path: '/buying-in-lombok',
    group: 'content',
    sections: [
      {
        id: 'intro',
        title: 'Introduction & disclaimer',
        fields: [
          line('trust.buyingLabel', 'Small label'),
          line('trust.pageHeadline', 'Headline'),
          text('trust.pageLead', 'Introduction'),
          text('trust.disclaimer', 'Educational disclaimer', {
            required: true,
            help: 'Keep it: this is not legal, tax or investment advice; encourage independent advice.',
          }),
        ],
      },
      {
        id: 'topics',
        title: 'Topics',
        lead: 'Each topic is a numbered item on the page. Topics 5–11 only appear once you give them a title.',
        fields: [
          line('trust.buying.ownership.title', '1 · Title'),
          text('trust.buying.ownership.detail', '1 · Text'),
          line('trust.buying.dueDiligence.title', '2 · Title'),
          text('trust.buying.dueDiligence.detail', '2 · Text'),
          line('trust.buying.zoning.title', '3 · Title'),
          text('trust.buying.zoning.detail', '3 · Text'),
          line('trust.buying.process.title', '4 · Title'),
          text('trust.buying.process.detail', '4 · Text'),
          ...(
            [
              ['freeholdLeasehold', 'Freehold vs leasehold'],
              ['ptPma', 'PT PMA / company structures'],
              ['notary', 'Notaries'],
              ['roadAccess', 'Road access'],
              ['costsTaxes', 'Transaction costs & taxes'],
              ['permits', 'Building permits'],
              ['offPlan', 'Buying off-plan'],
            ] as const
          ).flatMap(([id, name], i) => [
            line(`cms.buying.topic.${id}.title`, `${i + 5} · Title (suggested: ${name})`),
            text(`cms.buying.topic.${id}.detail`, `${i + 5} · Text`),
          ]),
        ],
      },
      {
        id: 'cta',
        title: 'Closing',
        fields: [line('trust.talkCta', 'Talk button'), line('trust.backToWhy', 'Link back to Why Lombok')],
      },
      seoSection('cms.buying.seo.title', 'cms.buying.seo.description', 'buying.seo.image'),
    ],
  },
  {
    key: 'private',
    title: 'Green Hill Private',
    summary: 'The private route for larger land, development and hospitality. Opportunities themselves are managed in Opportunities.',
    path: '/private',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Introduction',
        fields: [
          line('private.page.eyebrow', 'Small label'),
          title('private.page.headline'),
          text('private.page.lead', 'Introduction', { required: true }),
          line('private.page.talk', 'Talk button'),
          line('private.page.explore', 'Explore button'),
          line('private.page.heroCaption', 'Photograph caption'),
          line('private.page.heroSpine', 'Side label'),
        ],
        media: [{ slot: 'private.hero', label: 'Main photograph', altKey: 'private.page.heroAlt' }],
      },
      {
        id: 'audience',
        title: 'Who it is for',
        fields: [
          line('private.page.audience.eyebrow', 'Small label'),
          title('private.page.audience.title'),
          text('private.page.audience.lead', 'Introduction'),
          line('private.page.audience.items.investors.title', 'Private investors'),
          text('private.page.audience.items.investors.body', 'Private investors text'),
          line('private.page.audience.items.developers.title', 'Developers (large land & development)'),
          text('private.page.audience.items.developers.body', 'Developers text'),
          line('private.page.audience.items.hospitality.title', 'Hospitality'),
          text('private.page.audience.items.hospitality.body', 'Hospitality text'),
          line('private.page.audience.items.groups.title', 'Investment groups'),
          text('private.page.audience.items.groups.body', 'Investment groups text'),
          line('private.page.audience.continue', 'Button'),
        ],
      },
      {
        id: 'why',
        title: 'Why private',
        fields: [
          line('private.page.why.eyebrow', 'Small label'),
          title('private.page.why.title'),
          text('private.page.why.lead', 'Introduction'),
          line('private.page.why.points.a', 'Point 1'),
          line('private.page.why.points.b', 'Point 2'),
          line('private.page.why.points.c', 'Point 3'),
          line('private.page.why.points.d', 'Point 4'),
          line('private.page.why.plateLabel', 'Photograph label'),
        ],
        media: [{ slot: 'private.why', label: 'Photograph', altKey: 'private.page.why.imageAlt' }],
      },
      {
        id: 'opps',
        title: 'Private opportunities',
        lead: 'Only the wording. Teasers themselves come from Opportunities (private, with “Present as a teaser”).',
        fields: [
          line('private.page.opps.eyebrow', 'Small label'),
          line('private.page.opps.statement', 'Statement'),
          text('private.page.opps.empty', 'Text when no teaser is presented'),
          text('private.page.opps.withTeasers', 'Text when teasers are presented'),
          text('private.page.opps.withListings', 'Text when public opportunities exist but no teaser'),
          line('private.page.opps.teasersTitle', 'Teasers: heading'),
        ],
      },
      {
        id: 'approach',
        title: 'Relationship-led process',
        fields: [
          line('private.page.approach.eyebrow', 'Small label'),
          line('private.page.approach.title', 'Heading'),
          ...(['understand', 'consider', 'explore', 'discuss'] as const).flatMap((step, i) => [
            line(`private.page.approach.steps.${step}.title`, `Step ${i + 1}`),
            text(`private.page.approach.steps.${step}.body`, `Step ${i + 1} text`),
          ]),
        ],
      },
      {
        id: 'reece',
        title: 'Start a conversation',
        lead: 'Reece’s portrait here is the one set in Site settings.',
        fields: [
          line('private.page.reece.eyebrow', 'Small label'),
          title('private.page.reece.title'),
          text('private.page.reece.lead', 'Text'),
          line('private.page.reece.prompts.land', 'Prompt 1'),
          line('private.page.reece.prompts.hospitality', 'Prompt 2'),
          line('private.page.reece.prompts.development', 'Prompt 3'),
          line('private.page.reece.prompts.brief', 'Prompt 4'),
          line('private.page.reece.close', 'Closing line'),
          line('private.page.reece.photoAlt', 'Portrait description'),
        ],
      },
      {
        id: 'enquiry',
        title: 'Enquiry & closing',
        fields: [
          line('private.page.form.eyebrow', 'Form: small label'),
          line('private.page.form.title', 'Form: heading'),
          text('private.page.form.lead', 'Form: introduction'),
          line('private.page.final.eyebrow', 'Closing: small label'),
          line('private.page.final.title', 'Closing: heading'),
          text('private.page.final.lead', 'Closing: text'),
          line('private.page.final.explore', 'Closing: explore button'),
        ],
      },
      seoSection('private.page.seoTitle', 'private.page.seoDescription', 'private.seo.image'),
    ],
  },
  {
    key: 'opportunities',
    title: 'Opportunities page',
    summary: 'The collection page and the shared wording on every opportunity page. Opportunities themselves are edited in Opportunities.',
    path: '/properties',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Introduction',
        fields: [
          line('properties.archive.eyebrow', 'Small label'),
          title('properties.archive.headline'),
          text('properties.archive.lead', 'Introduction'),
        ],
        media: [{ slot: 'opportunities.hero', label: 'Main photograph', altKey: 'cms.opportunities.hero.alt' }],
      },
      {
        id: 'collection',
        title: 'The collection',
        fields: [
          line('properties.archive.collectionLabel', 'Small label'),
          title('properties.archive.collectionHeadline'),
          text('properties.archive.collectionLead', 'Text'),
          text('properties.archive.emptyCollection', 'Text while no opportunity is published'),
          line('properties.archive.emptyCollectionCta', 'Button while no opportunity is published'),
        ],
      },
      {
        id: 'close',
        title: 'Closing invitation',
        lead: 'Reece’s portrait here is the one set in Site settings.',
        fields: [
          line('properties.archive.closeEyebrow', 'Small label'),
          title('properties.archive.closeHeadline'),
          text('properties.archive.closeLead', 'Text'),
          line('properties.archive.talkToReece', 'Talk button'),
          line('properties.archive.closePrivate', 'Green Hill Private button'),
        ],
      },
      {
        id: 'memo',
        title: 'On every opportunity page',
        lead: 'Shared wording around each opportunity. The opportunity’s own details come from its record in Opportunities.',
        fields: [
          line('properties.memo.selected', 'Small label above the title'),
          line('properties.memo.whyGreenHill', 'Heading: why Green Hill likes it'),
          line('properties.memo.whyLookingAtThis', 'Heading for private opportunities'),
          line('properties.memo.developmentPotential', 'Heading: development potential'),
          text('properties.memo.conceptsNote', 'Note under development potential', {
            required: true,
            help: 'Keep it: concepts only, subject to zoning, planning and independent advice.',
          }),
          line('properties.memo.interested', 'Contact panel: heading'),
          text('properties.memo.interestedLead', 'Contact panel: text'),
          line('properties.memo.reeceRole', 'Contact panel: Reece’s role'),
          line('properties.memo.sendEnquiry', 'Enquiry button'),
          line('properties.memo.requestMemorandum', 'Private: memorandum button'),
          text('properties.memo.privateInformation', 'Private: information note'),
          text('properties.memo.whatsappMessage', 'WhatsApp message', {
            max: 300,
            help: 'Pre-filled when a visitor asks about an opportunity. Keep {title} and {reference}: they are replaced with the opportunity’s title and its reference in brackets, e.g. (GH-LOM-001).',
          }),
          line('properties.memo.otherOpportunities', 'Other opportunities: heading'),
          text('properties.memo.otherLead', 'Other opportunities: text'),
        ],
      },
      seoSection('cms.opportunities.seo.title', 'cms.opportunities.seo.description', 'opportunities.seo.image'),
    ],
  },
  {
    key: 'notes',
    title: 'Notes page',
    summary: 'The Notes (journal) page around the notes. The notes themselves are written in Notes.',
    path: '/intelligence',
    group: 'content',
    sections: [
      {
        id: 'hero',
        title: 'Introduction',
        fields: [
          line('notes.page.eyebrow', 'Small label'),
          title('notes.page.headline'),
          text('notes.page.lead', 'Introduction'),
          line('notes.page.heroCaption', 'Photograph caption'),
          line('notes.page.locality', 'Place'),
          line('notes.page.country', 'Country'),
        ],
        media: [
          { slot: 'notes.hero.portrait', label: 'Main photograph', altKey: 'notes.page.heroAlt' },
          { slot: 'notes.hero.background', label: 'Background photograph', help: 'Softened behind the introduction.' },
        ],
      },
      {
        id: 'featured',
        title: 'Featured note',
        fields: [
          line('notes.page.featuredEyebrow', 'Small label'),
          title('notes.page.featuredEmptyTitle', 'Heading while no note is published'),
          text('notes.page.featuredEmptyBody', 'Text while no note is published'),
          line('notes.page.readNote', 'Read link'),
        ],
      },
      {
        id: 'journal',
        title: 'The journal',
        fields: [
          line('notes.page.journalLabel', 'Small label'),
          line('notes.page.journalMeta', 'Topics line'),
          line('notes.page.fieldNotes', 'Photograph label'),
        ],
        media: [{ slot: 'notes.journal.photo', label: 'Photograph', altKey: 'notes.page.journalImageAlt' }],
      },
      {
        id: 'perspective',
        title: 'Green Hill perspective',
        fields: [
          line('notes.page.perspectiveEyebrow', 'Small label'),
          title('notes.page.perspectiveTitle'),
          text('notes.page.perspectiveBody', 'Text'),
          line('notes.page.perspectiveAttribution', 'Attribution'),
        ],
      },
      {
        id: 'themes',
        title: 'What the notes will cover',
        lead: 'Shown while no note is published.',
        fields: [
          line('notes.page.themesEyebrow', 'Small label'),
          line('notes.page.themesTitleBefore', 'Heading: before the gold word'),
          line('notes.page.themesTitleAccent', 'Heading: gold word'),
          line('notes.page.themesTitleAfter', 'Heading: after the gold word'),
          ...items(
            'notes.page.themes',
            [
              ['land', 'Theme 1'],
              ['lombok', 'Theme 2'],
              ['buying', 'Theme 3'],
              ['perspective', 'Theme 4'],
            ],
            'label',
          ),
          line('notes.page.themesCta', 'Button'),
        ],
      },
      {
        id: 'latest',
        title: 'Latest notes',
        fields: [
          line('notes.page.latestEyebrow', 'Small label'),
          title('notes.page.latestTitle'),
          text('notes.page.latestLead', 'Text'),
          text('notes.page.emptyBody', 'Text while no note is published'),
        ],
      },
      {
        id: 'topics',
        title: 'Continue exploring',
        fields: [
          line('notes.page.topicsEyebrow', 'Small label'),
          title('notes.page.topicsTitle'),
          text('notes.page.topicsLead', 'Text'),
          ...items(
            'notes.page.topics',
            [
              ['opportunities', 'Link 1'],
              ['about', 'Link 2'],
              ['lombok', 'Link 3'],
              ['buying', 'Link 4'],
              ['private', 'Link 5'],
            ],
            'label',
          ),
        ],
      },
      {
        id: 'final',
        title: 'Closing & end of each note',
        fields: [
          line('notes.page.finalEyebrow', 'Closing: small label'),
          title('notes.page.finalTitle', 'Closing: heading'),
          text('notes.page.finalLead', 'Closing: text'),
          line('notes.page.talkCta', 'Talk button'),
          line('notes.page.exploreCta', 'Explore button'),
          line('notes.page.articleEndEyebrow', 'End of each note: small label'),
          title('notes.page.articleEndTitle', 'End of each note: heading'),
          line('notes.page.relatedEyebrow', 'Related notes: small label'),
          title('notes.page.relatedTitle', 'Related notes: heading'),
        ],
      },
      seoSection('notes.page.seoTitle', 'notes.page.seoDescription', 'notes.seo.image'),
    ],
  },
  {
    key: 'enquire',
    title: 'Enquiry page',
    summary: 'The investor enquiry page. The form’s questions stay as designed so every enquiry arrives complete.',
    path: '/enquire',
    group: 'content',
    sections: [
      {
        id: 'standard',
        title: 'Investor enquiry',
        fields: [
          line('enquiry.page.eyebrow', 'Small label'),
          title('enquiry.page.title'),
          text('enquiry.page.lead', 'Introduction'),
        ],
      },
      {
        id: 'private',
        title: 'From a Green Hill Private opportunity',
        lead: 'Shown when a visitor requests an investment memorandum.',
        fields: [
          line('enquiry.page.privateEyebrow', 'Small label'),
          title('enquiry.page.privateTitle'),
          text('enquiry.page.privateLead', 'Introduction'),
        ],
      },
      {
        id: 'direct',
        title: 'WhatsApp line',
        fields: [line('enquiry.page.direct', 'Text'), line('enquiry.page.directLink', 'Link')],
      },
      {
        id: 'seo',
        title: 'Search & sharing',
        lead: 'How this page appears on Google and when shared. The site’s default sharing image is used.',
        fields: [
          line('enquiry.page.seoTitle', 'Title in search results', { help: 'Around 60 characters shows in full.', max: 90 }),
          text('enquiry.page.seoDescription', 'Description in search results', { max: 300 }),
        ],
      },
    ],
  },
  {
    key: 'site',
    title: 'Footer & contact',
    summary: 'Email, WhatsApp, Instagram and the footer wording used across the whole site.',
    path: '',
    group: 'settings',
    sections: [
      {
        id: 'contact',
        title: 'Contact details',
        lead: 'Used by every “Talk to Reece” button, the footer and the contact panel.',
        fields: [
          { key: 'cms.site.contact.name', label: 'Contact name', kind: 'line', shared: true, required: true, max: 80 },
          { key: 'cms.site.contact.email', label: 'Business email', kind: 'email', shared: true, required: true },
          {
            key: 'cms.site.contact.whatsapp',
            label: 'WhatsApp number',
            kind: 'phone',
            shared: true,
            required: true,
            help: 'With country code, e.g. +44 7810 062383.',
          },
          { key: 'cms.site.contact.instagram', label: 'Instagram link', kind: 'url', shared: true, help: 'e.g. https://www.instagram.com/greenhilllombok/' },
          text('cms.site.whatsapp.message', 'WhatsApp opening message', {
            help: 'Pre-filled when a visitor taps a general “Talk to Reece” button. Opportunity buttons name the opportunity automatically.',
            max: 300,
          }),
        ],
        media: [
          {
            slot: 'site.reece.portrait',
            label: 'Reece’s portrait in contact sections',
            help: 'Used on Why Lombok, Green Hill Private, the Opportunities page and every opportunity page.',
          },
        ],
      },
      {
        id: 'footer',
        title: 'Footer',
        fields: [
          text('footer.tagline', 'Short description'),
          line('footer.brandLine', 'Brand line'),
          line('footer.badge', 'Badge'),
          line('footer.location', 'Location'),
          line('footer.rights', 'Copyright line'),
          line('footer.slogan', 'Closing line'),
          line('footer.locationShort', 'Short location'),
          line('footer.cardChip', 'Photograph badge'),
          line('footer.trustOnGroundTitle', 'Promise 1'),
          text('footer.trustOnGroundBody', 'Promise 1: text'),
          line('footer.trustCuratedTitle', 'Promise 2'),
          text('footer.trustCuratedBody', 'Promise 2: text'),
          line('footer.trustTalkTitle', 'Promise 3'),
          text('footer.trustTalkBody', 'Promise 3: text'),
          line('footer.dockBrandNote', 'Contact panel: short line'),
        ],
        media: [{ slot: 'site.footer.photo', label: 'Footer photograph', altKey: 'cms.site.footer.photo.alt' }],
      },
    ],
  },
  {
    key: 'seo',
    title: 'Search & sharing defaults',
    summary: 'The site-wide title, description and sharing image used where a page has none of its own.',
    path: null,
    group: 'settings',
    sections: [
      {
        id: 'defaults',
        title: 'Defaults',
        lead: 'Each page and opportunity can override these. Search engines that do not run scripts read the built-in title until the site is rebuilt.',
        fields: [
          line('cms.seo.default.title', 'Site title', { max: 90 }),
          text('cms.seo.default.description', 'Site description', { max: 300 }),
        ],
        media: [{ slot: 'seo.default.image', label: 'Default sharing image' }],
      },
    ],
  },
];

export function pageDef(key: string): PageDef | undefined {
  return PAGES.find((page) => page.key === key);
}

export function allFields(page: PageDef): FieldDef[] {
  return page.sections.flatMap((section) => section.fields);
}

export function allMedia(page: PageDef): MediaDef[] {
  return page.sections.flatMap((section) => section.media ?? []);
}

export const BUYING_EXTRA_TOPICS = ['freeholdLeasehold', 'ptPma', 'notary', 'roadAccess', 'costsTaxes', 'permits', 'offPlan'] as const;
