/**
 * The approved copy and images that ship with the site. The admin shows them
 * as the starting point and offers "Restore original" for every field.
 * Admin-only module (imported by the content editor).
 */
import en from '@/lib/i18n/translations/en.json';
import id from '@/lib/i18n/translations/id.json';
import nl from '@/lib/i18n/translations/nl.json';
import es from '@/lib/i18n/translations/es.json';
import { HERO_SLIDES } from '@/components/home/hero/heroData';
import { CONTACT_NAME, INSTAGRAM_URL, PUBLIC_EMAIL, WHATSAPP_NUMBER_DISPLAY } from '@/lib/contact';
import { HOMEPAGE_CURATED_COUNT } from '@/components/home/opportunities/selectCuratedOpportunities';
import heroSection1 from '@/assets/greenhill/hero-masters/green-hill-hero-section-1.webp';
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import privateCard from '@/assets/greenhill/green-hill-private.webp';
import trustPhoto from '@/assets/greenhill/why-lombok-section-land-ocean.webp';
import finalPhoto from '@/assets/greenhill/sec-talk-to-reece1.webp';
import aboutBackground from '@/assets/greenhill/about-sec.webp';
import aboutStory from '@/assets/greenhill/about-story-premium.webp';
import aboutPlace from '@/assets/greenhill/about-place-premium.webp';
import aboutGround from '@/assets/greenhill/hero/green-hill-hero-on-the-ground-1506.webp';
import whyHero from '@/assets/greenhill/hero section image bg/green-hill-hero-section-1.webp';
import whyPlace from '@/assets/greenhill/land-holding.jpg';
import whySouth from '@/assets/greenhill/gh-private-why-landscape.jpg';
import whyAccess from '@/assets/greenhill/land-hillside.jpg';
import whyPace from '@/assets/greenhill/land-coastal.jpg';
import whyLonger from '@/assets/greenhill/why-lombok-section-land-ocean.webp';
import privateHero from '@/assets/greenhill/green-hill-private.webp';
import privateWhy from '@/assets/greenhill/gh-private-why-landscape.jpg';
import footerPhoto from '@/assets/greenhill/land-coastal.jpg';
import talkPhoto2 from '@/assets/greenhill/sec-talk-to-reece2.webp';
import talkPhoto3 from '@/assets/greenhill/sec-talk-to-reece3.webp';
import approachFeature from '@/assets/greenhill/source/reece-suv-elevated-original.jpg';
import approachGround from '@/assets/greenhill/source/reece-scooter-elevated-original.jpg';
import approachSelective from '@/assets/greenhill/hero/green-hill-hero-land-light-1200.webp';
import whyPlaceLand from '@/assets/greenhill/hero-land-landscape.jpg';
import whyAccessHills from '@/assets/greenhill/hero-hills.webp';
import whyAccessCoast from '@/assets/greenhill/land-beach.jpg';
import opportunitiesHero from '@/assets/greenhill/hero-masters/green-hill-hero-section-3.webp';
import notesPortrait from '@/assets/greenhill/source/reece-elevated-valley-original.jpg';
import type { ContentLocale } from './schema';

const BUNDLES: Record<ContentLocale, Record<string, unknown>> = { en, id, nl, es };

function resolve(bundle: Record<string, unknown>, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);
  return typeof value === 'string' ? value : undefined;
}

/** Built-in values for `cms.*` fields (they have no copy in the translation files). */
const CMS_DEFAULTS: Record<string, string> = {
  'cms.home.hero.slide1.title': HERO_SLIDES[0].title,
  'cms.home.hero.slide2.title': HERO_SLIDES[1].title,
  'cms.home.hero.slide3.title': HERO_SLIDES[2].title,
  'cms.home.hero.slide1.alt': HERO_SLIDES[0].alt,
  'cms.home.hero.slide2.alt': HERO_SLIDES[1].alt,
  'cms.home.hero.slide3.alt': HERO_SLIDES[2].alt,
  'cms.home.founder.portrait.alt': 'Reece Green at a villa overlooking the South Lombok coast at golden hour',
  'cms.home.private.card.alt': 'Cultivated fields and palm-lined hills in South Lombok at warm evening light',
  'cms.home.trust.photo.alt': 'Dirt path through green hills overlooking the ocean in South Lombok',
  'cms.home.final.photo.alt': 'Reece on site in South Lombok: real ground, real landscape',
  'cms.home.final.photo2.alt': 'Elevated Lombok land and coastal light from the ground',
  'cms.home.final.photo3.alt': 'South Lombok hillside and ocean from a site visit',
  'cms.opportunities.hero.alt': 'Elevated South Lombok valley at golden hour, looking across the landscape toward the coast',
  'cms.home.selected.count': String(HOMEPAGE_CURATED_COUNT),
  'cms.site.contact.name': CONTACT_NAME,
  'cms.site.contact.email': PUBLIC_EMAIL,
  'cms.site.contact.whatsapp': WHATSAPP_NUMBER_DISPLAY,
  'cms.site.contact.instagram': INSTAGRAM_URL,
};

/** The shipped value of a field in a language ('' when there is none). */
export function originalValue(key: string, locale: ContentLocale | '*'): string {
  if (key.startsWith('cms.')) {
    // Hero chapter names and descriptions ship in English only.
    return CMS_DEFAULTS[key] ?? '';
  }
  const lang = locale === '*' ? 'en' : locale;
  return resolve(BUNDLES[lang], key) ?? resolve(BUNDLES.en, key) ?? '';
}

/** The shipped image for each slot. */
export const ORIGINAL_MEDIA: Record<string, string> = {
  'home.hero.slide1': HERO_SLIDES[0].src,
  'home.hero.slide2': HERO_SLIDES[1].src,
  'home.hero.slide3': HERO_SLIDES[2].src,
  'home.founder.portrait': founderPortrait,
  'home.private.card': privateCard,
  'home.trust.photo': trustPhoto,
  'home.final.photo': finalPhoto,
  'home.seo.image': heroSection1,
  'about.hero.background': aboutBackground,
  'about.story.photo': aboutStory,
  'about.place.photo': aboutPlace,
  'about.ground.photo': aboutGround,
  'about.seo.image': founderPortrait,
  'why.hero': whyHero,
  'why.place': whyPlace,
  'why.south': whySouth,
  'why.access': whyAccess,
  'why.pace': whyPace,
  'why.longer': whyLonger,
  'why.seo.image': whyHero,
  'buying.seo.image': heroSection1,
  'private.hero': privateHero,
  'private.why': privateWhy,
  'private.seo.image': privateHero,
  'site.footer.photo': footerPhoto,
  'site.reece.portrait': founderPortrait,
  'home.final.photo2': talkPhoto2,
  'home.final.photo3': talkPhoto3,
  'about.approach.feature': approachFeature,
  'about.approach.ground': approachGround,
  'about.approach.selective': approachSelective,
  'about.approach.longTerm': whyPlace,
  'why.place.slide2': whyPlaceLand,
  'why.place.slide3': footerPhoto,
  'why.place.slide4': whyLonger,
  'why.access.slide2': whyAccessHills,
  'why.access.slide4': whyAccessCoast,
  'opportunities.hero': opportunitiesHero,
  'opportunities.seo.image': opportunitiesHero,
  'notes.hero.portrait': notesPortrait,
  'notes.hero.background': heroSection1,
  'notes.journal.photo': talkPhoto3,
  'notes.seo.image': heroSection1,
  'seo.default.image': heroSection1,
};
