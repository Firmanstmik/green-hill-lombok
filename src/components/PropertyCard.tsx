import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Heart } from 'lucide-react';
import { Property } from '@/data/mockData';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PropertyCardProps {
  property: Property;
  index?: number;
  eager?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const statusColors = {
  rent: 'bg-white/90 text-foreground',
  sale: 'bg-white/90 text-foreground',
  investment: 'bg-white/90 text-foreground',
};

const statusLabelKeys = {
  rent: 'properties.forRent',
  sale: 'properties.forSell',
  investment: 'properties.forInvestment',
};

export function PropertyCard({ property, index = 0, eager, isSaved: externalIsSaved, onToggleSave }: PropertyCardProps) {
  const isExternalMode = onToggleSave !== undefined;

  // Internal state — only used when parent doesn't provide saved state
  const [internalIsSaved, setInternalIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();
  const { currency, formatPrice } = useCurrency();

  // Internal fallback: fetch user + saved status per card (N+1 pattern)
  // Skipped when parent provides onToggleSave
  useEffect(() => {
    if (isExternalMode) return;
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser && property.id) {
          const { data: savedData } = await supabase
            .from('saved_listings')
            .select('id')
            .eq('property_id', property.id)
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (savedData) {
            setInternalIsSaved(true);
            setSavedId(savedData.id);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();
  }, [property.id, isExternalMode]);

  const saved = isExternalMode ? (externalIsSaved ?? false) : internalIsSaved;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isExternalMode) {
      onToggleSave!();
      return;
    }

    if (!user) {
      toast.error('Sign in to save properties');
      return;
    }

    setSaving(true);
    try {
      if (internalIsSaved && savedId) {
        await supabase
          .from('saved_listings')
          .delete()
          .eq('id', savedId);
        setInternalIsSaved(false);
        setSavedId(null);
        toast.success('Property removed from saved');
      } else {
        const { data, error } = await supabase
          .from('saved_listings')
          .insert({ property_id: property.id, user_id: user.id })
          .select('id')
          .single();

        if (error) throw error;
        setInternalIsSaved(true);
        setSavedId(data?.id ?? null);
        toast.success('Property saved');
      }
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const propertyStatus = ((property as any).price_type || property.status || 'sale') as keyof typeof statusLabelKeys;
  const propertyTitle = property.title || 'Property Listing';
  const propertyImage = property.image || (property as any).image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
  const propertySqft = property.sqft || (property as any).m2 || 0;
  const propertyAddress = property.address || 'Address not provided';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link to={`/${language}/property/${property.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
          <img
            src={propertyImage}
            alt={propertyTitle}
            loading={eager ? undefined : "lazy"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Save Button - Top Left */}
          <button
            onClick={handleSave}
            className={`absolute top-4 left-4 p-2.5 rounded-full transition-all duration-300 z-10 ${saved
              ? 'bg-ukon-red text-white shadow-lg scale-110'
              : 'bg-white/80 text-foreground hover:bg-white hover:scale-110 backdrop-blur-sm'
              }`}
          >
            <Heart size={18} className={saved ? 'fill-current' : ''} />
          </button>

          {/* Status Badge - Top Right */}
          <div
            className={`absolute top-4 right-4 ${statusColors[propertyStatus] || 'bg-white/90'} px-3 py-1.5 rounded-full text-[11px] font-sans font-medium tracking-[0.12em] uppercase backdrop-blur-sm`}
          >
            {t(statusLabelKeys[propertyStatus]) || t('properties.available')}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {/* Location */}
          <div className="flex items-center gap-1 text-[#2D3621]/55">
            <MapPin size={14} className="text-[#2D3621]/40" />
            <span className="gh-meta">
              {propertyAddress.includes(',')
                ? propertyAddress.split(',').slice(-2).join(',').trim()
                : propertyAddress}
            </span>
          </div>

          {/* Title */}
          <h3 className="gh-card-title text-[#2D3621] group-hover:text-[#3D4636] transition-colors">
            {propertyTitle}
          </h3>

          {/* Specs Row */}
          <div className="flex items-center gap-4 text-[#2D3621]/50 gh-meta">
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                <path d="M21 7H3l2-4h14l2 4Z" />
                <path d="M7 11h4" />
              </svg>
              <span>{property.bedrooms || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
              </svg>
              <span>{property.bathrooms || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
              </svg>
              <span>{propertySqft.toLocaleString()} m<sup>2</sup></span>
            </div>
          </div>

          {/* Price — 0 means undisclosed / on request (demo Green Hill data) */}
          <p className="gh-price text-[#2D3621] pt-1">
            {property.price > 0 ? (
              <>
                {formatPrice(property.price, currency, language)}
                {propertyStatus === 'rent' && (
                  <span className="text-sm font-normal text-[#2D3621]/50 ml-1">{t('propertyDetail.perMonth')}</span>
                )}
              </>
            ) : (
              <span className="tracking-[0.04em]">On request</span>
            )}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
