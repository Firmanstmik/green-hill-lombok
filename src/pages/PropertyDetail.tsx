import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
    Bed,
    Bath,
    Square,
    MapPin,
    ArrowLeft,
    Share2,
    Heart,
    MessageCircle,
    ChevronRight,
    ChevronLeft,
    ShieldCheck,
    Calendar,
    Info,
    CheckCircle2,
    Facebook,
    Twitter,
    Linkedin,
    Send,
    Link as LinkIcon,
    School,
    Hospital,
    ShoppingBag,
    Bus,
    Plane,
    Trees
} from 'lucide-react';
import { properties as mockProperties } from '@/data/mockData';
import ListingContactForm from '@/components/messaging/ListingContactForm';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/PropertyCard';
import { Lightbox } from '@/components/ui/Lightbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { PropertyMap } from '@/components/map/PropertyMap';
import NearbyAmenities from '@/components/property/NearbyAmenities';
import { DescriptionRenderer } from '@/components/property/DescriptionRenderer';
import { getEmbedUrl } from '@/lib/video-utils';
import { useSavedListings } from '@/hooks/useSavedListings';

const PropertyDetail = () => {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const { isSaved: isPropertySaved, toggle: toggleSaved } = useSavedListings();
    const { currency, formatPrice: formatCurrencyPrice } = useCurrency();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [sellerProfile, setSellerProfile] = useState<{
        agency_name: string | null;
        profile_image_url: string | null;
        is_ukon_partner: boolean;
    } | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                // Green Hill isolation: use local demo data unless a GH database is configured
                if (!isSupabaseConfigured) {
                    const mockProperty = mockProperties.find((p) => p.id === id) || mockProperties[0];
                    setProperty(mockProperty || null);
                    setLoading(false);
                    return;
                }

                // Try fetching from Supabase first
                const { data, error } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (data) {
                    const normalized = {
                        ...data,
                        image: data.image_url || data.image,
                        sqft: data.m2 || data.sqft || 0,
                        priceType: data.price_type || data.priceType,
                        isUkonAgent: data.is_ukon_agent || data.isUkonAgent,
                        buildingArea: data.building_area || data.buildingArea,
                        surfaceArea: data.surface_area || data.surfaceArea,
                        yearBuilt: data.year_built || data.yearBuilt,
                        listingCode: data.listing_code || data.listingCode,
                        description: data.description || data.description,
                        nearbyAmenities: data.nearby_amenities || data.nearbyAmenities,
                        images: data.images || [data.image_url || data.image],
                        video_url: data.video_url
                    };
                    setProperty(normalized);

                    // Fetch seller profile for partner badge and agent info
                    if (data.user_id) {
                        try {
                            const { data: sellerData } = await supabase.rpc(
                                'get_seller_profile_for_property',
                                { p_user_id: data.user_id }
                            );
                            if (sellerData && sellerData.length > 0) {
                                setSellerProfile(sellerData[0]);
                            }
                        } catch (sellerErr) {
                            console.error('Error fetching seller profile:', sellerErr);
                        }
                    }

                    // Track view on page load
                    try {
                        await supabase.rpc('increment_property_views', { p_property_id: data.id });
                    } catch (viewError) {
                        console.error('Error tracking view:', viewError);
                    }
                } else {
                    // Fallback to mock data
                    const mock = mockProperties.find(p => p.id === id);
                    if (mock) {
                        setProperty({
                            ...mock,
                            images: mock.images || [mock.image]
                        });
                    } else {
                        setProperty(null);
                    }
                }
            } catch (err) {
                console.error('Error fetching property:', err);
                const mock = mockProperties.find(p => p.id === id);
                setProperty(mock || null);
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    // Check if property is saved and get user
    useEffect(() => {
        const checkSavedStatus = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                setUser(authUser);

                if (authUser && id) {
                    const { data: savedData } = await supabase
                        .from('saved_listings')
                        .select('id')
                        .eq('property_id', id)
                        .eq('user_id', authUser.id)
                        .maybeSingle();

                    if (savedData) {
                        setIsSaved(true);
                        setSavedId(savedData.id);
                    }
                }
            } catch (error) {
                console.error('Error checking saved status:', error);
            }
        };

        checkSavedStatus();
    }, [id]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: property?.title,
                    text: `Check out this property: ${property?.title}`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const handleSave = async () => {
        if (!user) {
            toast.error('Sign in to save properties');
            return;
        }

        setSaving(true);
        try {
            if (isSaved && savedId) {
                // Delete saved listing
                await supabase
                    .from('saved_listings')
                    .delete()
                    .eq('id', savedId);
                setIsSaved(false);
                setSavedId(null);
                toast.success('Property removed from saved');
            } else {
                // Insert new saved listing
                const { data, error } = await supabase
                    .from('saved_listings')
                    .insert({ property_id: id, user_id: user.id })
                    .select('id')
                    .single();

                if (error) throw error;
                setIsSaved(true);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#0e2e50] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold mb-4 text-[#0e2e50]">{t('properties.notFound')}</h1>
                <Link to={`/${language}/properties`}>
                    <Button variant="default" className="bg-ukon-red hover:bg-ukon-red/90 rounded-full h-12 px-8">
                        {t('properties.backToProperties')}
                    </Button>
                </Link>
            </div>
        );
    }

    const similarProperties = mockProperties
        .filter((p) => p.id !== property.id && (p.status === property.status || p.status === (property as any).price_type))
        .slice(0, 3);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-20 pb-16">
                {/* Subtle Header Sectioning */}
                <div className="bg-[#0e2e50]/[0.015] border-b border-[#0e2e50]/[0.05] mb-12">
                    <div className="container mx-auto px-4 py-10">

                        {/* Header: Title, Location & Actions */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-[#0e2e50] font-bold uppercase tracking-wider mb-2">
                                    <MapPin size={14} />
                                    <span>{property.address.split(',')[1]?.trim() || property.address}</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                                    {property.title}
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="rounded-full gap-2 border-border hover:bg-secondary px-6 h-11 bg-white shadow-sm"
                                        >
                                            <Share2 size={18} />
                                            <span>{t('propertyDetail.share')}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-3 rounded-2xl border-border shadow-2xl bg-card" align="end">
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                {
                                                    icon: <MessageCircle size={20} />,
                                                    label: 'WhatsApp',
                                                    color: 'bg-[#25D366]',
                                                    link: `https://wa.me/?text=${encodeURIComponent(`Check out this property: ${property.title} - ${window.location.href}`)}`
                                                },
                                                {
                                                    icon: <Facebook size={20} />,
                                                    label: 'Facebook',
                                                    color: 'bg-[#1877F2]',
                                                    link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`
                                                },
                                                {
                                                    icon: <Twitter size={20} />,
                                                    label: 'X',
                                                    color: 'bg-[#000000]',
                                                    link: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this property: ${property.title}`)}&url=${encodeURIComponent(window.location.href)}`
                                                },
                                                {
                                                    icon: <Linkedin size={20} />,
                                                    label: 'LinkedIn',
                                                    color: 'bg-[#0A66C2]',
                                                    link: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`
                                                }
                                            ].map((social) => (
                                                <a
                                                    key={social.label}
                                                    href={social.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-secondary transition-colors group"
                                                >
                                                    <div className={`w-10 h-10 ${social.color} text-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                                        {social.icon}
                                                    </div>
                                                    <span className="text-[10px] font-medium text-muted-foreground">{social.label}</span>
                                                </a>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <button
                                                onClick={handleShare}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors text-sm font-medium"
                                            >
                                                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                                    <LinkIcon size={16} />
                                                </div>
                                                Copy Link
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    variant="outline"
                                    className={`rounded-full gap-2 border-border hover:bg-secondary px-6 h-11 bg-white shadow-sm transition-all duration-300 ${isSaved ? 'text-ukon-red border-ukon-red bg-ukon-red/5' : ''
                                        }`}
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <Heart size={18} className={isSaved ? 'fill-current' : ''} />
                                    <span>{saving ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4">
                    {/* Gallery Section */}

                    {/* Premium Image Gallery (Airbnb Style) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-12 aspect-[16/9] md:aspect-[21/9]">
                        {/* Big Picture */}
                        <div
                            className="md:col-span-2 md:row-span-2 relative group overflow-hidden cursor-pointer"
                            onClick={() => {
                                setSelectedImageIndex(0);
                                setIsLightboxOpen(true);
                            }}
                        >
                            <img
                                src={property.images[0] || property.image}
                                alt={property.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                        </div>
                        {/* 4 Smaller Pictures */}
                        {property.images.slice(1, 5).map((img, idx) => (
                            <div
                                key={idx}
                                className="relative group hidden md:block overflow-hidden cursor-pointer"
                                onClick={() => {
                                    setSelectedImageIndex(idx + 1);
                                    setIsLightboxOpen(true);
                                }}
                            >
                                <img
                                    src={img}
                                    alt={`${property.title} ${idx + 2}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                {idx === 3 && property.images.length > 5 && (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold hover:bg-black/50 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex(5);
                                            setIsLightboxOpen(true);
                                        }}
                                    >
                                        {t('propertyDetail.showAllPhotos')} ({property.images.length})
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <Lightbox
                        images={property.images}
                        initialIndex={selectedImageIndex}
                        isOpen={isLightboxOpen}
                        onClose={() => setIsLightboxOpen(false)}
                    />

                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Left Column: Information */}
                        <div className="lg:w-2/3 space-y-12">
                            {/* Description */}
                            <section>
                                <h3 className="text-2xl font-bold mb-6">{t('propertyDetail.description')}</h3>
                                {property.description_json ? (
                                    <DescriptionRenderer json={property.description_json} />
                                ) : property.description ? (
                                    <div className="max-w-[680px] text-lg leading-[1.75] text-muted-foreground">
                                        <p>{property.description}</p>
                                    </div>
                                ) : (
                                    <div className="max-w-[680px] text-lg leading-[1.75] text-muted-foreground">
                                        <p>
                                            Experience the pinnacle of luxury living in this exquisite {property.title.toLowerCase()}.
                                            Nestled in a prime location, this property offers a rare
                                            combination of modern design, unmatched comfort, and strategic location.
                                        </p>
                                        <p className="mt-4">
                                            The interior boasts high ceilings, floor-to-ceiling windows that flood the rooms with natural light,
                                            and premium finishes throughout. Whether you're looking for a permanent residence or an
                                            investment opportunity, this property delivers on every front.
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* Video Tour */}
                            {property.video_url && getEmbedUrl(property.video_url) && (
                                <section>
                                    <h3 className="text-2xl font-bold mb-6">Video Tour</h3>
                                    <div className="rounded-2xl overflow-hidden border border-border/50 aspect-video">
                                        <iframe
                                            src={getEmbedUrl(property.video_url)!}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title="Property Video Tour"
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Property Details & Amenities */}
                            <section>
                                <h3 className="text-2xl font-bold mb-8">{t('propertyDetail.homeInfoAmenities')}</h3>
                                <div className="space-y-10">
                                    {/* Features Grid */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-bold text-[#0e2e50] flex items-center gap-2">
                                            <div className="w-1 h-6 bg-[#0e2e50] rounded-full" />
                                            Property Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-2xl overflow-hidden">
                                            {Object.entries(property.features || {}).map(([key, value], idx) => (
                                                <div
                                                    key={key}
                                                    className={`flex justify-between items-center p-4 ${idx % 2 === 0 ? 'bg-secondary/20' : ''} border-b border-border md:border-b-0`}
                                                >
                                                    <span className="text-muted-foreground font-medium">{key}</span>
                                                    <span className="font-bold text-foreground">{value as any}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Nearby Amenities */}
                                    {(property.nearbyAmenities || property.nearby_amenities) && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-bold text-[#0e2e50] flex items-center gap-2">
                                                <div className="w-1 h-6 bg-[#0e2e50] rounded-full" />
                                                {t('propertyDetail.nearbyPointsOfInterest')}
                                            </h4>
                                            <NearbyAmenities
                                                amenities={property.nearbyAmenities || property.nearby_amenities}
                                            />
                                        </div>
                                    )}

                                    {/* Empty state when no amenities */}
                                    {!(property.nearbyAmenities || property.nearby_amenities) && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-bold text-[#0e2e50] flex items-center gap-2">
                                                <div className="w-1 h-6 bg-[#0e2e50] rounded-full" />
                                                {t('propertyDetail.nearbyPointsOfInterest')}
                                            </h4>
                                            <NearbyAmenities
                                                amenities={undefined}
                                                showEmpty={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Location (Mapbox Interactive Map) */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold">{t('propertyDetail.location')}</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full gap-2 text-[#0e2e50] border-[#0e2e50] hover:bg-[#0e2e50]/5"
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`, '_blank')}
                                    >
                                        <MapPin size={16} />
                                        {t('propertyDetail.openInGoogleMaps')}
                                    </Button>
                                </div>
                                {property.latitude && property.longitude ? (
                                    <PropertyMap
                                        latitude={property.latitude}
                                        longitude={property.longitude}
                                        address={property.address}
                                        title={property.title}
                                        height="aspect-video"
                                    />
                                ) : (
                                    <div className="w-full aspect-video rounded-3xl bg-muted flex items-center justify-center border border-border">
                                        <div className="text-center text-muted-foreground">
                                            <MapPin size={32} className="mx-auto mb-2" />
                                            <p className="font-medium">{t('propertyDetail.locationCoordinatesNotAvailable')}</p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Right Column: Sticky Overview & Contact */}
                        <div className="lg:w-1/3 relative">
                            <div className="sticky top-28 space-y-6">
                                {/* Verified Partner Badge */}
                                {sellerProfile?.is_ukon_partner && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative overflow-hidden rounded-3xl p-5 flex items-center gap-4 bg-gradient-to-br from-[#0e2e50] to-[#1a4a7a] text-white shadow-xl shadow-[#0e2e50]/20"
                                    >
                                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-2xl" />

                                        <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white">
                                            <span className="text-[10px] font-serif text-center leading-tight text-[#0e2e50]">Green<br />Hill</span>
                                        </div>
                                        <div className="relative z-10 flex-1">
                                            <h5 className="font-black text-sm uppercase tracking-wider mb-0.5 leading-none">
                                                {t('propertyDetail.verifiedPartner')}
                                            </h5>
                                            <p className="text-xs text-white/80">
                                                {t('propertyDetail.verifiedPartnerDesc')}
                                            </p>
                                        </div>

                                        <motion.div
                                            animate={{
                                                y: [0, -4, 0],
                                                scale: [1, 1.1, 1],
                                                rotateY: [0, 15, 0]
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="ml-auto w-8 h-8 flex items-center justify-center bg-[#22c55e] rounded-full shadow-lg shadow-green-500/30 border-2 border-white/20"
                                            style={{ perspective: '1000px' }}
                                        >
                                            <CheckCircle2 className="text-white" size={18} />
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* Overview Card */}
                                <div className="bg-card border border-border rounded-3xl p-8 shadow-sm overflow-hidden relative">
                                    {/* Branding Accent */}
                                    <div className="absolute top-0 left-0 w-2 h-full bg-[#0e2e50]" />

                                    <div className="mb-8 p-4 bg-secondary/30 rounded-2xl">
                                        <p className="text-muted-foreground text-sm mb-1">{t('propertyDetail.pricingStartingFrom')}</p>
                                        <h2 className="text-4xl font-black text-[#0e2e50]">
                                            {formatCurrencyPrice(property.price, currency, language)}
                                            {property.priceType === 'rent' && <span className="text-lg font-normal text-muted-foreground">{t('propertyDetail.perMonth')}</span>}
                                        </h2>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-lg font-bold border-b border-border pb-2">{t('propertyDetail.overview')}</h4>
                                        <div className="space-y-4">
                                            {[
                                                { labelKey: 'propertyDetail.propertyCode', value: property.listing_code || property.listingCode },
                                                { labelKey: 'propertyDetail.bedrooms', value: property.bedrooms },
                                                { labelKey: 'propertyDetail.bathrooms', value: property.bathrooms },
                                                { labelKey: 'propertyDetail.buildingArea', value: property.m2 ? `${property.m2} m²` : null },
                                                { labelKey: 'propertyDetail.landSize', value: property.land_size ? `${property.land_size} m²` : null },
                                                { labelKey: 'propertyDetail.yearBuilt', value: property.year_built || property.yearBuilt },
                                                { labelKey: 'propertyDetail.ownership', value: property.ownership },
                                                { labelKey: 'propertyDetail.furnishing', value: ({ 'unfurnished': 'Unfurnished', 'semi-furnished': 'Semi-Furnished', 'fully-furnished': 'Fully Furnished' } as Record<string, string>)[property.furnishing] || property.furnishing },
                                                { labelKey: 'propertyDetail.parking', value: ({ 'private': 'Private Garage', 'carport': 'Carport', 'shared': 'Shared', 'street': 'Street' } as Record<string, string>)[property.parking_type] || property.parking_type },
                                            ].map((item) => (
                                                <div key={item.labelKey} className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{t(item.labelKey)}</span>
                                                    <span className="font-bold text-foreground">{item.value || 'N/A'}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-6 border-t border-border">
                                            <h4 className="text-lg font-bold mb-4">{t('propertyDetail.contactAgent')}</h4>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-full bg-secondary overflow-hidden shrink-0 border-2 border-[#0e2e50]/20 p-0.5">
                                                    {sellerProfile?.profile_image_url ? (
                                                        <img
                                                            src={sellerProfile.profile_image_url}
                                                            alt="Agent"
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <span className="w-full h-full flex items-center justify-center text-[10px] font-serif text-center leading-tight text-[#0e2e50]">GH</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">
                                                        {sellerProfile?.agency_name || 'Green Hill'}
                                                    </p>
                                                </div>
                                            </div>

                                            <ListingContactForm
                                                listingId={property.id}
                                                sellerId={property.user_id}
                                                listingTitle={property.title}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Similar Properties */}
                    <section className="mt-24 border-t border-border pt-16">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h3 className="text-3xl font-bold mb-2">{t('propertyDetail.similarProperties')}</h3>
                                <p className="text-muted-foreground">{t('propertyDetail.discoverOtherProperties')}</p>
                            </div>
                            <Link to={`/${language}/properties`} className="text-ukon-red font-bold flex items-center gap-1 group">
                                {t('propertyDetail.seeMore')} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {similarProperties.map((p, index) => (
                                <PropertyCard
                                    key={p.id}
                                    property={p}
                                    index={index}
                                    isSaved={isPropertySaved(p.id)}
                                    onToggleSave={() => toggleSaved(p.id)}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PropertyDetail;
