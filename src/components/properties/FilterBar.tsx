import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronDown, SlidersHorizontal, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { RefinePanel } from './RefinePanel';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { PriceRangeInput } from './PriceRangeInput';
import type { FilterState } from '@/types/filters';
import type { UseFiltersReturn } from '@/hooks/useFilters';
import { PROPERTY_TYPES, BEDROOM_OPTIONS } from '@/types/filters';
import { cn } from '@/lib/utils';

type OpenPanel = 'country' | 'location' | 'price' | 'bedrooms' | 'propertyType' | 'refine' | null;

/** Lombok areas — Green Hill is island-focused, not international */
const LOMBOK_REGIONS = [
  'South Lombok',
  'Central Lombok',
  'Northwest Lombok',
  'East Lombok',
  'West Lombok',
  'Kuta Selatan',
] as const;

interface FilterBarProps {
  filters: FilterState;
  setFilter: UseFiltersReturn['setFilter'];
  resetFilters: () => void;
  activeFilterCount: number;
  resultCount: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  IDR: 'Rp',
};

function formatShort(numStr: string, currency: string): string {
  const n = parseFloat(numStr.replace(/[^0-9]/g, ''));
  if (isNaN(n)) return '';
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  if (n >= 1_000_000) {
    const val = (n / 1_000_000).toFixed(1).replace('.0', '');
    return `${sym}${val}M`;
  }
  if (n >= 1_000) {
    const val = Math.round(n / 1_000);
    return `${sym}${val}K`;
  }
  return `${sym}${n}`;
}

export function FilterBar({
  filters,
  setFilter,
  resetFilters,
  activeFilterCount,
  resultCount,
}: FilterBarProps) {
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  const barRef = useRef<HTMLDivElement>(null);
  const refineButtonRef = useRef<HTMLButtonElement>(null);
  const locationAnchorRef = useRef<HTMLDivElement>(null);

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileCountryOpen, setMobileCountryOpen] = useState(false);

  const toggle = (panel: OpenPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  // Count refine panel active filters
  const refineCount = (() => {
    let count = 0;
    if (filters.bathrooms !== 'any') count++;
    if (filters.minSize || filters.maxSize) count++;
    count += filters.lifestyle.length;
    return count;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      ref={barRef}
      className="relative"
    >
      {/* ====== MOBILE COMPACT BAR (< lg) ====== */}
      <div className="lg:hidden">
        <div
          className="h-12 bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg
                     border border-border/30 relative px-3 flex items-center justify-between gap-2 w-full"
        >
          {/* Transaction Type Pills */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(['all', 'sale', 'rent'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter('transactionType', type)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap',
                  filters.transactionType === type
                    ? 'bg-ukon-red/8 text-ukon-red font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {type === 'all'
                  ? t('filters.transactionType.all')
                  : type === 'sale'
                    ? t('filters.transactionType.sale')
                    : t('filters.transactionType.rent')}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border/25 flex-shrink-0" />

          {/* Region / lokasi Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMobileCountryOpen((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors whitespace-nowrap rounded-full',
                mobileCountryOpen || filters.country
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <MapPin size={13} />
              {filters.country || t('filters.country')}
              <ChevronDown
                size={12}
                className={cn(
                  'transition-transform duration-200',
                  mobileCountryOpen ? 'rotate-180' : ''
                )}
              />
            </button>

            <AnimatePresence>
              {mobileCountryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-52
                             rounded-xl shadow-xl border border-border/25 py-2 backdrop-blur-lg bg-background/95"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        setFilter('country', '');
                        setMobileCountryOpen(false);
                      }}
                      className={cn(
                        'px-4 py-2.5 text-sm text-left transition-colors',
                        filters.country === ''
                          ? 'bg-ukon-red/8 text-ukon-red font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      {t('filters.allRegions')}
                    </button>
                    {LOMBOK_REGIONS.map((region) => (
                      <button
                        key={region}
                        onClick={() => {
                          setFilter('country', region);
                          setMobileCountryOpen(false);
                        }}
                        className={cn(
                          'px-4 py-2.5 text-sm text-left transition-colors',
                          filters.country === region
                            ? 'bg-ukon-red/8 text-ukon-red font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border/25 flex-shrink-0" />

          {/* Filters Button → opens drawer */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 mr-1 text-xs transition-colors whitespace-nowrap rounded-full flex-shrink-0',
              activeFilterCount > 0
                ? 'bg-ukon-red/8 text-ukon-red font-medium'
                : 'text-muted-foreground'
            )}
          >
            <SlidersHorizontal size={13} />
            {t('filters.refine')}
            {activeFilterCount > 0 && (
              <span
                className="w-4 h-4 rounded-full bg-ukon-red/10 text-ukon-red text-[10px]
                           flex items-center justify-center font-semibold"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Results Counter */}
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center justify-between px-2 py-2.5 text-sm text-muted-foreground"
          >
            <span>
              <span className="text-foreground font-medium">{resultCount}</span>
              {' '}
              {t('filters.propertiesFound')}
            </span>
            <button
              onClick={resetFilters}
              className="text-ukon-red text-xs hover:text-ukon-red/80 transition-colors"
            >
              {t('filters.clearAll')}
            </button>
          </motion.div>
        )}

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          filters={filters}
          setFilter={setFilter}
          resetFilters={resetFilters}
          resultCount={resultCount}
        />
      </div>

      {/* ====== DESKTOP FULL BAR (lg+) ====== */}
      <div className="hidden lg:block">
        {/* Main Filter Bar */}
        <div
          className="h-14 bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg
                     border border-border/30 relative px-6"
        >
          {/* Inner flex container - buttons and dropdowns */}
          <div className="h-full flex items-stretch gap-4">
            {/* Section 1: Transaction Type (inline pills) */}
            <div className="flex items-center gap-1 px-3 flex-shrink-0 relative">
            {(['all', 'sale', 'rent'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter('transactionType', type)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap',
                  filters.transactionType === type
                    ? 'bg-ukon-red/8 text-ukon-red font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {type === 'all'
                  ? t('filters.transactionType.all')
                  : type === 'sale'
                    ? t('filters.transactionType.sale')
                    : t('filters.transactionType.rent')}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 2: Wilayah / lokasi */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => toggle('country')}
              className={cn(
                'h-full flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap',
                openPanel === 'country' || filters.country
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MapPin size={15} />
              {filters.country || t('filters.country')}
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  openPanel === 'country' ? 'rotate-180' : ''
                )}
              />
            </button>

            <AnimatePresence>
              {openPanel === 'country' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 max-w-[90vw]
                             rounded-xl shadow-xl border border-border/25 py-2 backdrop-blur-lg"
                  style={{
                    background: `
                      linear-gradient(135deg, rgba(250, 249, 246, 0.95) 0%, rgba(253, 252, 251, 0.95) 100%),
                      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")
                    `,
                  }}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        setFilter('country', '');
                        setOpenPanel(null);
                      }}
                      className={cn(
                        'px-4 py-2.5 text-sm text-left transition-colors',
                        filters.country === ''
                          ? 'bg-ukon-red/8 text-ukon-red font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      {t('filters.allRegions')}
                    </button>
                    {LOMBOK_REGIONS.map((region) => (
                      <button
                        key={region}
                        onClick={() => {
                          setFilter('country', region);
                          setOpenPanel(null);
                        }}
                        className={cn(
                          'px-4 py-2.5 text-sm text-left transition-colors',
                          filters.country === region
                            ? 'bg-ukon-red/8 text-ukon-red font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 3: Location (direct search input) */}
          <div className="relative flex-shrink-0 flex-1 min-w-[200px]" ref={locationAnchorRef}>
            <div
              className={cn(
                'h-full flex items-center gap-2 px-6 text-sm transition-colors whitespace-nowrap bg-background rounded-lg border',
                filters.location
                  ? 'border-ukon-red/60 bg-ukon-red/8'
                  : 'border-border/30 hover:border-border/50'
              )}
            >
              <Search size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilter('location', e.target.value)}
                placeholder={t('filters.locationPlaceholder') || 'Location...'}
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder-muted-foreground"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 4: Price Range */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => toggle('price')}
              className={cn(
                'h-full flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap',
                openPanel === 'price' || filters.minPrice || filters.maxPrice
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filters.minPrice || filters.maxPrice
                ? `${formatShort(filters.minPrice, currency)}${filters.maxPrice ? ' – ' + formatShort(filters.maxPrice, currency) : '+'}`
                : t('filters.priceRange')}
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  openPanel === 'price' ? 'rotate-180' : ''
                )}
              />
            </button>

            <AnimatePresence>
              {openPanel === 'price' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-80 max-w-[90vw]
                             rounded-xl shadow-xl border border-border/25 p-5 backdrop-blur-lg"
                  style={{
                    background: `
                      linear-gradient(135deg, rgba(250, 249, 246, 0.95) 0%, rgba(253, 252, 251, 0.95) 100%),
                      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")
                    `,
                  }}
                >
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-4">
                    {currency} {t('filters.priceRange')}
                  </div>
                  <PriceRangeInput
                    minPrice={filters.minPrice}
                    maxPrice={filters.maxPrice}
                    onMinChange={(v) => setFilter('minPrice', v)}
                    onMaxChange={(v) => setFilter('maxPrice', v)}
                    currency={currency}
                    formatPrice={formatPrice}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 5: Bedrooms */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => toggle('bedrooms')}
              className={cn(
                'h-full flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap',
                openPanel === 'bedrooms' || filters.bedrooms !== 'any'
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filters.bedrooms === 'any'
                ? t('filters.bedrooms')
                : `${filters.bedrooms}+ ${t('filters.beds')}`}
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  openPanel === 'bedrooms' ? 'rotate-180' : ''
                )}
              />
            </button>

            <AnimatePresence>
              {openPanel === 'bedrooms' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 max-w-[90vw]
                             rounded-xl shadow-xl border border-border/25 p-4 backdrop-blur-lg"
                  style={{
                    background: `
                      linear-gradient(135deg, rgba(250, 249, 246, 0.95) 0%, rgba(253, 252, 251, 0.95) 100%),
                      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")
                    `,
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    {BEDROOM_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setFilter('bedrooms', opt as FilterState['bedrooms']);
                          setOpenPanel(null);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm transition-colors border',
                          filters.bedrooms === opt
                            ? 'bg-ukon-red/8 text-ukon-red font-medium border-ukon-red/30'
                            : 'border-border/40 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt === 'any' ? t('filters.any') : `${opt}+`}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 6: Property Type */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => toggle('propertyType')}
              className={cn(
                'h-full flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap',
                openPanel === 'propertyType' || filters.propertyType !== 'all'
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filters.propertyType === 'all'
                ? t('filters.propertyType')
                : filters.propertyType}
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  openPanel === 'propertyType' ? 'rotate-180' : ''
                )}
              />
            </button>

            <AnimatePresence>
              {openPanel === 'propertyType' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 max-w-[90vw]
                             rounded-xl shadow-xl border border-border/25 py-2 backdrop-blur-lg"
                  style={{
                    background: `
                      linear-gradient(135deg, rgba(250, 249, 246, 0.95) 0%, rgba(253, 252, 251, 0.95) 100%),
                      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")
                    `,
                  }}
                >
                  <div className="flex flex-col">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilter('propertyType', type as FilterState['propertyType']);
                          setOpenPanel(null);
                        }}
                        className={cn(
                          'px-4 py-2.5 text-sm text-left transition-colors',
                          filters.propertyType === type
                            ? 'bg-ukon-red/8 text-ukon-red font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                      >
                        {type === 'all'
                          ? t('filters.allTypes')
                          : t(`filters.propertyTypes.${type.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border/25 self-center flex-shrink-0" />

          {/* Section 7: Refine */}
          <div className="relative flex-shrink-0">
            <button
              ref={refineButtonRef}
              onClick={() => toggle('refine')}
              className={cn(
                'h-full flex items-center gap-2 px-4 text-sm transition-colors whitespace-nowrap',
                openPanel === 'refine' || refineCount > 0
                  ? 'bg-ukon-red/8 text-ukon-red font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SlidersHorizontal size={15} />
              {t('filters.refine')}
              {refineCount > 0 && (
                <span
                  className="w-5 h-5 rounded-full bg-ukon-red/8 text-ukon-red text-xs
                             flex items-center justify-center font-medium"
                >
                  {refineCount}
                </span>
              )}
            </button>

            <RefinePanel
              isOpen={openPanel === 'refine'}
              filters={filters}
              setFilter={setFilter}
              resetFilters={resetFilters}
              onClose={() => setOpenPanel(null)}
              anchorRef={refineButtonRef}
            />
          </div>
          </div>
        </div>

        {/* Results Counter (shows only when filtered) */}
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center justify-between px-[2vw] py-3 text-sm text-muted-foreground"
          >
            <span>
              <span className="text-foreground font-medium">{resultCount}</span>
              {' '}
              {t('filters.propertiesFound')}
            </span>
            <button
              onClick={resetFilters}
              className="text-ukon-red text-xs hover:text-ukon-red/80 transition-colors"
            >
              {t('filters.clearAll')}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
