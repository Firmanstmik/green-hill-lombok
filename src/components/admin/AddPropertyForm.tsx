import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { SortableImage } from './SortableImage';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import {
    Building2,
    MapPin,
    ChevronRight,
    ChevronLeft,
    Image as ImageIcon,
    Check,
    GripVertical,
    School,
    Hospital,
    ShoppingBag,
    Bus,
    Plane,
    Trees,
    Plus,
    Trash2,
    Upload,
    X,
    Loader2,
    Home,
    Car,
    FileText,
    Calendar,
    Layers,
    Info,
    ShieldCheck,
    Waves,
    Wind,
    Sun,
    Wifi,
    Tv,
    ClipboardCheck,
    RefreshCw,
    Sparkles,
    TrendingUp,
    Eye,
    Bed,
    Bath,
    Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { generateListingCode } from '@/lib/listingCodeGenerator';
import { toast } from 'sonner';
import { z } from 'zod';
import ListingPreview from './ListingPreview';
import { AddressAutocomplete } from '@/components/map/AddressAutocomplete';
import { fetchNearbyPOIs } from '@/lib/poi';
import POIEditor from './POIEditor';
import { useListingDraft } from '@/hooks/useListingDraft';
import { useCompletionScore } from '@/hooks/useCompletionScore';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ListingControlHeader } from './ListingControlHeader';
import { PerformanceSnapshot } from './PerformanceSnapshot';
import { OptimizationSuggestions, type OptimizationSuggestion } from './OptimizationSuggestions';
import { DescriptionEditor } from './DescriptionEditor';
import { tiptapJsonToPlainText, plainTextToTiptapJson, type JSONContent } from '@/lib/tiptap-utils';
import { MarketIntelligence } from './MarketIntelligence';
import { LuxuryTabNavigation, type Tab as TabType } from './LuxuryTabNavigation';
import { PhaseIndicator } from './PhaseIndicator';
import { NumericStepper } from './NumericStepper';
import { SpecificationsStep } from './SpecificationsStep';
import { generateListingDescription } from '@/services/ai/generateListingDescription';

const propertySchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description_summary: z.string().min(20, 'Description must be at least 20 characters'),
    address: z.string().min(10, 'Full address is required'),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    formatted_address: z.string().optional(),
    price: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Valid price is required'),
    bedrooms: z.string().optional(),
    bathrooms: z.string().optional(),
    m2: z.string().optional(),
    property_type: z.string(),
    listing_code: z.string(),
    images: z.array(z.string()).min(1, 'At least one image is required'),
}).refine(
    (data) => {
        if (data.address && data.address.length > 10) {
            return data.latitude !== null && data.longitude !== null;
        }
        return true;
    },
    {
        message: 'Please select a valid address from suggestions',
        path: ['address']
    }
);

type Step = 'basic' | 'details' | 'media' | 'amenities' | 'review' | 'performance';

interface AddPropertyFormProps {
    onComplete: () => void;
    propertyId?: string;
    initialTab?: Step;
}

// Format price number based on currency with locale-aware separators
const formatPriceNumber = (value: string | number, currency: string): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    // Use Intl.NumberFormat for locale-aware formatting
    const locales: Record<string, string> = {
        USD: 'en-US',  // 1,250,000
        EUR: 'de-DE',  // 1.250.000
        GBP: 'en-GB',  // 1,250,000
        IDR: 'id-ID',  // 1.250.000
    };

    try {
        return new Intl.NumberFormat(locales[currency] || 'en-US').format(num);
    } catch {
        return num.toString();
    }
};

// Generate locale-specific placeholder examples for price input
const getPricePlaceholder = (currency: string): string => {
    // Realistic market range examples per currency
    const placeholders: Record<string, number> = {
        USD: 1250000,    // High-end property market
        EUR: 250000,     // European luxury market
        GBP: 750000,     // UK property market
        IDR: 2500000000, // Indonesian market (large numbers)
    };

    const amount = placeholders[currency] || placeholders.USD;
    const locales: Record<string, string> = {
        USD: 'en-US',
        EUR: 'de-DE',
        GBP: 'en-GB',
        IDR: 'id-ID',
    };

    try {
        return new Intl.NumberFormat(locales[currency] || 'en-US').format(amount);
    } catch {
        return amount.toString();
    }
};

const AddPropertyForm = ({ onComplete, propertyId, initialTab }: AddPropertyFormProps) => {
    const [currentStep, setCurrentStep] = useState<Step>(
        propertyId && initialTab ? initialTab : 'basic'
    );
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [poiLoading, setPoiLoading] = useState(false);
    const [aiGeneratingDescription, setAiGeneratingDescription] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const [isEditMode] = useState(!!propertyId);
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
    const [listingCodeManuallyEdited, setListingCodeManuallyEdited] = useState(false);
    const { currency, setCurrency, availableCurrencies, convert, convertToEUR } = useCurrency();

    const initialListingCode = useMemo(() => `UK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, []);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        description_summary: '',
        description_json: null as JSONContent | null,
        description_interior: '',
        description_outdoor: '',
        description_investment: '',
        address: '',
        latitude: null as number | null,
        longitude: null as number | null,
        formatted_address: '',
        countryCode: '' as string,
        price: '',
        price_type: 'sale',
        bedrooms: '',
        bathrooms: '',
        m2: '',
        status: 'draft' as 'draft' | 'active' | 'under_offer' | 'sold' | 'archived',
        property_type: 'Villa',
        ownership: 'Freehold',
        year_built: new Date().getFullYear().toString(),
        surface_area: '',
        building_area: '',
        listing_code: initialListingCode,
        featured: false,
        parking_spaces: '',
        parking_type: 'private',
        hoa_fees: '',
        property_tax: '',
        lot_size: '',
        land_size: '',
        zoning: 'Residential',
        furnishing: 'unfurnished',
        is_investment: false,
        rental_income_estimate: '',
        roi_percent: '',
        stories: '',
        last_renovated: '',
        lease_years: '',
        interior_features: [] as string[],
        appliances: [] as string[],
        hvac_type: '',
        outdoor_features: [] as string[],
        community_amenities: [] as string[],
        lifestyle_tags: [] as string[],
        energy_rating: '',
        available_date: '',
        virtual_tour_url: '',
        video_url: '',
        images: [] as string[],
        image_url: '',
        nearby_amenities: [] as any[],
        poi_fetched_at: null as string | null,
        poi_source: 'osm' as 'osm' | 'mapbox' | 'manual',
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState({
        views: 0,
        saves: 0,
        inquiries: 0,
        daysOnMarket: 0,
    });

    const { saveDraft, loadDraft, clearDraft, savedAgo } = useListingDraft();
    const completionScore = useCompletionScore(formData);
    const animatedStrengthScore = useAnimatedValue(completionScore.percent);

    // Load property data in edit mode
    useEffect(() => {
        if (isEditMode && propertyId) {
            const loadProperty = async () => {
                try {
                    setLoading(true);
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');

                    const { data, error } = await supabase
                        .from('properties')
                        .select('*')
                        .eq('id', propertyId)
                        .eq('user_id', user.id)
                        .single();

                    if (error) throw error;

                    if (data) {
                        setFormData(prev => ({
                            ...prev,
                            title: data.title || '',
                            description: data.description || '',
                            description_summary: data.description || '',
                            description_json: data.description_json || (data.description ? plainTextToTiptapJson(data.description) : null),
                            description_interior: data.description_interior || '',
                            description_outdoor: data.description_outdoor || '',
                            description_investment: data.description_investment || '',
                            address: data.address || '',
                            latitude: data.latitude,
                            longitude: data.longitude,
                            formatted_address: data.formatted_address || '',
                            countryCode: data.countryCode || '',
                            price: data.price ? convert(data.price, currency).toString() : '',
                            price_type: data.price_type || data.status || 'sale',
                            bedrooms: data.bedrooms?.toString() || '',
                            bathrooms: data.bathrooms?.toString() || '',
                            m2: data.m2?.toString() || '',
                            status: data.status || 'draft',
                            property_type: data.property_type || 'Villa',
                            ownership: data.ownership || 'Freehold',
                            year_built: data.year_built?.toString() || new Date().getFullYear().toString(),
                            surface_area: data.surface_area?.toString() || '',
                            building_area: data.building_area?.toString() || '',
                            listing_code: data.listing_code || '',
                            featured: data.featured || false,
                            parking_spaces: data.parking_spaces?.toString() || '',
                            parking_type: data.parking_type || 'private',
                            hoa_fees: data.hoa_fees?.toString() || '',
                            property_tax: data.property_tax?.toString() || '',
                            lot_size: data.lot_size?.toString() || '',
                            land_size: data.land_size?.toString() || '',
                            zoning: data.zoning || 'Residential',
                            furnishing: data.furnishing || 'unfurnished',
                            is_investment: data.is_investment || false,
                            rental_income_estimate: data.rental_income_estimate?.toString() || '',
                            roi_percent: data.roi_percent?.toString() || '',
                            stories: data.stories?.toString() || '',
                            last_renovated: data.last_renovated?.toString() || '',
                            lease_years: data.lease_years?.toString() || '',
                            interior_features: data.interior_features || [],
                            appliances: data.appliances || [],
                            hvac_type: data.hvac_type || '',
                            outdoor_features: data.outdoor_features || [],
                            community_amenities: data.community_amenities || [],
                            lifestyle_tags: data.lifestyle_tags || [],
                            energy_rating: data.energy_rating || '',
                            available_date: data.available_date || '',
                            virtual_tour_url: data.virtual_tour_url || '',
                            video_url: data.video_url || '',
                            images: data.images || (data.image_url ? [data.image_url] : []),
                            image_url: data.image_url || data.images?.[0] || '',
                            nearby_amenities: data.nearby_amenities || [],
                            poi_fetched_at: data.poi_fetched_at || null,
                            poi_source: data.poi_source || 'osm',
                        }));

                        // Calculate days on market from created_at if property is active/listed
                        let daysOnMarket = 0;
                        if (data.created_at && data.status === 'active') {
                            const createdDate = new Date(data.created_at);
                            const now = new Date();
                            daysOnMarket = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                        }

                        // Fetch views and inquiries from listing_analytics
                        const { data: analyticsData } = await supabase
                            .from('listing_analytics')
                            .select('views, inquiries')
                            .eq('property_id', propertyId)
                            .maybeSingle();

                        // Fetch saves count from saved_listings (more accurate than storing separately)
                        const { count: savesCount } = await supabase
                            .from('saved_listings')
                            .select('*', { count: 'exact', head: true })
                            .eq('property_id', propertyId);

                        setPerformanceMetrics({
                            views: analyticsData?.views || 0,
                            saves: savesCount || 0,
                            inquiries: analyticsData?.inquiries || 0,
                            daysOnMarket,
                        });
                    }
                } catch (error: any) {
                    console.error('Error loading property:', error);
                    toast.error('Failed to load property details');
                } finally {
                    setLoading(false);
                }
            };

            loadProperty();
        }
    }, [isEditMode, propertyId]);

    // Close currency dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if click is on currency button or dropdown
            if (!target.closest('[data-currency-selector]')) {
                setShowCurrencyDropdown(false);
            }
        };

        if (showCurrencyDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showCurrencyDropdown]);

    // Auto-generate structured listing code when all required fields are set
    useEffect(() => {
        if (!listingCodeManuallyEdited && formData.countryCode && formData.price_type && formData.property_type) {
            const newCode = generateListingCode(
                formData.countryCode,
                formData.price_type,
                formData.property_type
            );
            if (newCode) {
                setFormData(prev => ({ ...prev, listing_code: newCode }));
            }
        }
    }, [formData.countryCode, formData.price_type, formData.property_type, listingCodeManuallyEdited]);

    const steps: { id: Step; label: string; icon: any }[] = [
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'details', label: 'Specifications', icon: Layers },
        { id: 'media', label: 'Media', icon: ImageIcon },
        { id: 'amenities', label: 'Amenities', icon: ShieldCheck },
        { id: isEditMode ? 'performance' : 'review', label: isEditMode ? 'Performance' : 'Review', icon: ClipboardCheck },
    ];

    // Generate optimization suggestions based on form data
    const generateOptimizationSuggestions = (): OptimizationSuggestion[] => {
        const suggestions: OptimizationSuggestion[] = [];

        if (!formData.description_interior || formData.description_interior.length < 100) {
            suggestions.push({
                id: 'interior-description',
                title: 'Strengthen Interior Description',
                description: 'Add more details about interior features and finishes to boost engagement.',
                priority: 'high',
                targetTab: 'amenities',
                action: () => setCurrentStep('amenities'),
            });
        }

        if (formData.images.length < 8) {
            suggestions.push({
                id: 'add-images',
                title: 'Add More Photos',
                description: `You have ${formData.images.length} images. Listings with 8+ photos get 40% more views.`,
                priority: 'high',
                targetTab: 'media',
                action: () => setCurrentStep('media'),
            });
        }

        if (!formData.virtual_tour_url && formData.property_type === 'Villa') {
            suggestions.push({
                id: 'virtual-tour',
                title: 'Add Virtual Tour',
                description: 'Virtual tours increase buyer engagement by up to 70% for luxury properties.',
                priority: 'medium',
                targetTab: 'media',
                action: () => setCurrentStep('media'),
            });
        }

        if (!formData.outdoor_features || formData.outdoor_features.length === 0) {
            suggestions.push({
                id: 'outdoor-features',
                title: 'Highlight Outdoor Features',
                description: 'Add information about garden, patio, or outdoor amenities.',
                priority: 'medium',
                targetTab: 'amenities',
                action: () => setCurrentStep('amenities'),
            });
        }

        return suggestions;
    };

    const optimizationSuggestions = generateOptimizationSuggestions();

    const handleStatusChange = (newStatus: string) => {
        setFormData(prev => ({
            ...prev,
            status: newStatus as any,
        }));
        setHasChanges(true);
    };

    const handlePriceUpdate = (newPrice: number) => {
        setFormData(prev => ({
            ...prev,
            price: newPrice.toString(),
        }));
        setHasChanges(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
        // Track if listing code was manually edited
        if (name === 'listing_code') {
            setListingCodeManuallyEdited(true);
        }
    };

    // Special handler for price input with auto-formatting
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // Extract only digits
        const digitsOnly = input.replace(/\D/g, '');
        // Store raw digits in formData
        setFormData(prev => ({ ...prev, price: digitsOnly }));
        setHasChanges(true);
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const toggleFeature = (type: 'interior' | 'appliances' | 'outdoor' | 'community', value: string) => {
        const fieldName = type === 'community' ? 'community_amenities' : `${type}_features` as keyof typeof formData;

        const current = formData[fieldName as keyof typeof formData] as string[];
        setFormData(prev => ({
            ...prev,
            [fieldName]: current.includes(value)
                ? current.filter(i => i !== value)
                : [...current, value]
        }));
    };

    const handleGenerateDescriptionWithAI = async () => {
        if (aiGeneratingDescription) return;
        setAiGeneratingDescription(true);
        try {
            const { description_json, description_summary } = await generateListingDescription();
            setFormData(prev => ({
                ...prev,
                description_json,
                description_summary,
            }));
            setHasChanges(true);
        } catch (error) {
            toast.error('Failed to generate description');
        } finally {
            setAiGeneratingDescription(false);
        }
    };

    const handleFileUpload = async (files: File[]) => {
        setUploading(true);
        const totalFiles = files.length;
        let completedFiles = 0;

        const uploadPromises = files.map(async (file) => {
            try {
                const options = {
                    maxSizeMB: 0.8,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };

                const compressedFile = await imageCompression(file, options);
                const fileExt = 'webp';
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, compressedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(filePath);

                // Update state incrementally for each successful upload
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, publicUrl],
                    image_url: prev.image_url || publicUrl
                }));

                completedFiles++;
            } catch (error: any) {
                console.error(`Error uploading ${file.name}:`, error);
                toast.error(`Failed to upload ${file.name}`);
            }
        });

        await Promise.all(uploadPromises);

        if (completedFiles > 0) {
            toast.success(`Successfully uploaded ${completedFiles} of ${totalFiles} images`);
        }
        setUploading(false);
    };

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        if (rejectedFiles.length > 0) {
            console.warn('Rejected files:', rejectedFiles);
            const reasons = rejectedFiles.map(rf => rf.errors.map((e: any) => e.message).join(', ')).join(' | ');
            toast.error(`Some files were rejected: ${reasons}`);
        }

        if (acceptedFiles.length > 0) {
            handleFileUpload(acceptedFiles);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpeg', '.jpg', '.JPG'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxSize: 52428800 // 50MB
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.images.indexOf(active.id as string);
                const newIndex = prev.images.indexOf(over.id as string);
                const newImages = arrayMove(prev.images, oldIndex, newIndex);

                return {
                    ...prev,
                    images: newImages,
                    image_url: newImages[0] || prev.image_url
                };
            });
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => {
            const newImages = [...prev.images];
            const removed = newImages.splice(index, 1)[0];
            return {
                ...prev,
                images: newImages,
                image_url: prev.image_url === removed ? (newImages[0] || '') : prev.image_url
            };
        });
    };

    const handleSubmit = async () => {
        setErrors({});

        // Validate required fields
        const validation = propertySchema.safeParse(formData);
        if (!validation.success) {
            const newErrors: Record<string, string> = {};
            validation.error.issues.forEach(issue => {
                newErrors[issue.path[0]] = issue.message;
            });
            setErrors(newErrors);

            // Jump to first step with error
            if (newErrors.title || newErrors.description_summary || newErrors.address || newErrors.price) {
                setCurrentStep('basic');
            } else if (newErrors.images) {
                setCurrentStep('media');
            }

            toast.error('Please fix the errors before publishing');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const payload = {
                title: formData.title,
                description: formData.description_summary,
                description_json: formData.description_json,
                address: formData.address,
                latitude: formData.latitude,
                longitude: formData.longitude,
                formatted_address: formData.formatted_address,
                price: convertToEUR(parseFloat(formData.price) || 0, currency),
                price_type: formData.price_type,
                bedrooms: parseInt(formData.bedrooms) || 0,
                bathrooms: parseInt(formData.bathrooms) || 0,
                m2: parseInt(formData.m2) || 0,
                status: isEditMode ? formData.status : 'active',
                property_type: formData.property_type,
                ownership: formData.ownership,
                year_built: formData.year_built,
                listing_code: formData.listing_code,
                featured: formData.featured,
                parking_spaces: parseInt(formData.parking_spaces) || 0,
                parking_type: formData.parking_type,
                hoa_fees: parseFloat(formData.hoa_fees) || 0,
                property_tax: parseFloat(formData.property_tax) || 0,
                lot_size: parseFloat(formData.lot_size) || 0,
                land_size: parseFloat(formData.land_size) || 0,
                zoning: formData.zoning,
                furnishing: formData.furnishing,
                is_investment: formData.is_investment,
                rental_income_estimate: parseFloat(formData.rental_income_estimate) || 0,
                roi_percent: parseFloat(formData.roi_percent) || 0,
                stories: parseInt(formData.stories) || 0,
                last_renovated: formData.last_renovated ? parseInt(formData.last_renovated) : null,
                lease_years: parseInt(formData.lease_years) || 0,
                available_date: formData.available_date || null,
                interior_features: formData.interior_features,
                appliances: formData.appliances,
                hvac_type: formData.hvac_type,
                outdoor_features: formData.outdoor_features,
                community_amenities: formData.community_amenities,
                lifestyle_tags: formData.lifestyle_tags,
                energy_rating: formData.energy_rating,
                virtual_tour_url: formData.virtual_tour_url,
                video_url: formData.video_url,
                images: formData.images,
                image_url: formData.image_url,
                nearby_amenities: formData.nearby_amenities || [],
                poi_fetched_at: formData.poi_fetched_at,
                poi_source: formData.poi_source,
                user_id: user.id,
                published_at: new Date().toISOString(),
                last_modified_at: new Date().toISOString()
            };

            let error;

            if (isEditMode && propertyId) {
                // Update existing property — exclude user_id to prevent ownership reassignment
                const { user_id: _uid, ...updatePayload } = payload;
                const { error: updateError } = await supabase
                    .from('properties')
                    .update(updatePayload)
                    .eq('id', propertyId)
                    .eq('user_id', user.id);
                error = updateError;
                if (!error) {
                    toast.success('Property updated successfully!');
                }
            } else {
                // Create new property
                const { error: insertError } = await supabase
                    .from('properties')
                    .insert([payload]);
                error = insertError;
                if (!error) {
                    toast.success('Property published successfully!');
                }
            }

            if (error) throw error;
            setHasChanges(false);
            setLastSaved(new Date());
            onComplete();
        } catch (error: any) {
            toast.error(error.message || 'Error publishing property');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const payload = {
                title: formData.title,
                description: formData.description_summary,
                description_json: formData.description_json,
                address: formData.address,
                latitude: formData.latitude,
                longitude: formData.longitude,
                formatted_address: formData.formatted_address,
                price: convertToEUR(parseFloat(formData.price) || 0, currency),
                price_type: formData.price_type,
                bedrooms: parseInt(formData.bedrooms) || 0,
                bathrooms: parseInt(formData.bathrooms) || 0,
                m2: parseInt(formData.m2) || 0,
                status: 'draft' as const,
                property_type: formData.property_type,
                ownership: formData.ownership,
                year_built: formData.year_built,
                listing_code: formData.listing_code,
                featured: formData.featured,
                parking_spaces: parseInt(formData.parking_spaces) || 0,
                parking_type: formData.parking_type,
                hoa_fees: parseFloat(formData.hoa_fees) || 0,
                property_tax: parseFloat(formData.property_tax) || 0,
                lot_size: parseFloat(formData.lot_size) || 0,
                land_size: parseFloat(formData.land_size) || 0,
                zoning: formData.zoning,
                furnishing: formData.furnishing,
                is_investment: formData.is_investment,
                rental_income_estimate: parseFloat(formData.rental_income_estimate) || 0,
                roi_percent: parseFloat(formData.roi_percent) || 0,
                stories: parseInt(formData.stories) || 0,
                last_renovated: formData.last_renovated ? parseInt(formData.last_renovated) : null,
                lease_years: parseInt(formData.lease_years) || 0,
                available_date: formData.available_date || null,
                interior_features: formData.interior_features,
                appliances: formData.appliances,
                hvac_type: formData.hvac_type,
                outdoor_features: formData.outdoor_features,
                community_amenities: formData.community_amenities,
                lifestyle_tags: formData.lifestyle_tags,
                energy_rating: formData.energy_rating,
                virtual_tour_url: formData.virtual_tour_url,
                video_url: formData.video_url,
                images: formData.images,
                image_url: formData.image_url,
                nearby_amenities: formData.nearby_amenities || [],
                poi_fetched_at: formData.poi_fetched_at,
                poi_source: formData.poi_source,
                user_id: user.id,
                last_modified_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('properties')
                .insert([payload]);

            if (error) throw error;

            setHasChanges(false);
            toast.success('Draft saved successfully.');
            onComplete();
        } catch (error: any) {
            toast.error(error.message || 'Error saving draft');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 'basic') setCurrentStep('details');
        else if (currentStep === 'details') setCurrentStep('media');
        else if (currentStep === 'media') setCurrentStep('amenities');
        else if (currentStep === 'amenities') setCurrentStep('review');
    };

    const prevStep = () => {
        if (currentStep === 'details') setCurrentStep('basic');
        else if (currentStep === 'media') setCurrentStep('details');
        else if (currentStep === 'amenities') setCurrentStep('media');
        else if (currentStep === 'review') setCurrentStep('amenities');
        else if (currentStep === 'performance') setCurrentStep('amenities');
    };

    // Auto-save to localStorage
    useEffect(() => {
        saveDraft(formData);
    }, [formData, saveDraft]);

    // Load draft on mount
    useEffect(() => {
        const draft = loadDraft();
        if (draft) {
            setFormData(prev => ({ ...prev, ...draft }));
        }
    }, []);

    // EDIT MODE: Luxury Asset Management Console
    if (isEditMode) {
        return (
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
                {/* Listing Control Header */}
                <ListingControlHeader
                    title={formData.title || 'Untitled Listing'}
                    price={formData.price ? parseFloat(formData.price) : 0}
                    address={formData.address}
                    status={formData.status}
                    coverImage={formData.image_url}
                    listingCode={formData.listing_code}
                    listingId={propertyId}
                    performanceScore={completionScore.percent}
                    daysOnMarket={3}
                    views={342}
                    onStatusChange={handleStatusChange}
                    onPriceUpdate={handlePriceUpdate}
                />

                {/* Main Content Area */}
                <div className="bg-white rounded-[3rem] shadow-sm border border-border">
                    {/* Tab Navigation */}
                    <LuxuryTabNavigation
                        tabs={steps.map(s => ({ id: s.id as TabType, label: s.label }))}
                        activeTab={currentStep as TabType}
                        onTabChange={(tab) => setCurrentStep(tab as Step)}
                    />

                    <div className="p-8 md:p-10 min-h-[500px]">
                        <AnimatePresence mode="wait">
                    {currentStep === 'basic' && (
                        <motion.div
                            key="basic"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 gap-8">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1">Property Title</label>
                                        <Input
                                            name="title"
                                            placeholder="e.g. Modern Minimalist Villa with Pool"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            className={`h-16 rounded-[1.5rem] bg-secondary/5 font-bold text-lg px-6 ${errors.title ? 'border-ukon-red ring-1 ring-ukon-red' : 'border-border'}`}
                                        />
                                        {errors.title && <p className="text-xs text-ukon-red font-bold ml-2">{errors.title}</p>}
                                    </div>
                                    <div className="space-y-2 w-48">
                                        <label className="text-xs font-bold text-muted-foreground/70 ml-1 uppercase tracking-wide">Listing ID</label>
                                        <div className="h-16 rounded-[1.5rem] bg-secondary/35 flex items-center justify-center font-mono font-bold text-[#0e2e50]/75">
                                            {formData.listing_code}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#0e2e50] ml-1 uppercase">Type</label>
                                        <Select value={formData.property_type} onValueChange={(v) => handleSelectChange('property_type', v)}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-secondary/5 font-bold border-border">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {['Villa', 'House', 'Apartment', 'Penthouse', 'Commercial', 'Land'].map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1">Listed For</label>
                                        <Select value={formData.price_type} onValueChange={(v) => handleSelectChange('price_type', v)}>
                                            <SelectTrigger className="h-16 rounded-[1.5rem] bg-secondary/5 border-border font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                <SelectItem value="sale">For Sale</SelectItem>
                                                <SelectItem value="rent">For Rent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Address</label>
                                    <AddressAutocomplete
                                        value={formData.address}
                                        onChange={(v) => setFormData(prev => ({ ...prev, address: v }))}
                                        onSelect={async (result) => {
                                            // Set address info
                                            setFormData(prev => ({
                                                ...prev,
                                                address: result.formattedAddress,
                                                formatted_address: result.formattedAddress,
                                                latitude: result.latitude,
                                                longitude: result.longitude,
                                                countryCode: result.countryCode || '',
                                                nearby_amenities: [], // Clear old POIs
                                            }));

                                            // Fetch POIs
                                            setPoiLoading(true);
                                            toast.info('Finding nearby amenities...');
                                            try {
                                                const pois = await fetchNearbyPOIs(
                                                    result.latitude,
                                                    result.longitude
                                                );
                                                setFormData(prev => ({
                                                    ...prev,
                                                    nearby_amenities: pois,
                                                    poi_fetched_at: new Date().toISOString(),
                                                    poi_source: 'osm'
                                                }));

                                                if (pois.length === 0) {
                                                    toast.warning(
                                                        'No nearby amenities found in this area'
                                                    );
                                                } else {
                                                    toast.success(
                                                        `Found ${pois.length} nearby points of interest`
                                                    );
                                                }
                                            } catch (error) {
                                                console.error('POI fetch error:', error);
                                                toast.error(
                                                    'Could not load nearby amenities. You can add them manually.'
                                                );
                                            } finally {
                                                setPoiLoading(false);
                                            }
                                        }}
                                        error={errors.address}
                                        placeholder="Start typing your property address..."
                                        disabled={poiLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Price</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            data-currency-selector=""
                                            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg hover:bg-[#0e2e50]/10 transition-colors text-[#0e2e50] font-bold text-sm cursor-pointer z-10"
                                            title="Click to change currency"
                                        >
                                            {currency}
                                        </button>
                                        <Input
                                            name="price"
                                            type="text"
                                            placeholder={getPricePlaceholder(currency)}
                                            value={formatPriceNumber(formData.price, currency)}
                                            onChange={handlePriceChange}
                                            className="pl-16 h-16 rounded-[1.5rem] bg-secondary/5 border-border text-2xl font-black text-[#0e2e50] placeholder:opacity-50 flex items-center"
                                            inputMode="numeric"
                                        />
                                        {/* Currency Selector Dropdown */}
                                        {showCurrencyDropdown && (
                                            <div data-currency-selector="" className="absolute left-4 top-full mt-2 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden min-w-[120px]">
                                                {availableCurrencies.map((curr) => (
                                                    <button
                                                        key={curr}
                                                        type="button"
                                                        data-currency-selector=""
                                                        onClick={() => {
                                                            const rawPrice = parseFloat(formData.price) || 0;
                                                            const priceInEUR = convertToEUR(rawPrice, currency);
                                                            const newPrice = convert(priceInEUR, curr);
                                                            setFormData(prev => ({ ...prev, price: Math.round(newPrice).toString() }));
                                                            setCurrency(curr);
                                                            setShowCurrencyDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/30 last:border-b-0 font-bold text-sm ${
                                                            currency === curr
                                                                ? 'bg-[#0e2e50]/10 text-[#0e2e50]'
                                                                : 'hover:bg-secondary/30 text-foreground'
                                                        }`}
                                                    >
                                                        {curr}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'details' && (
                        <SpecificationsStep
                            formData={formData}
                            handleInputChange={handleInputChange}
                            handleSelectChange={handleSelectChange}
                        />
                    )}

                    {currentStep === 'media' && (
                        <motion.div
                            key="media"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Media Assets</label>
                                    <Info size={16} className="text-muted-foreground" />
                                </div>

                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-[3rem] p-16 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer group ${errors.images ? 'border-ukon-red bg-ukon-red/5' : isDragActive ? 'border-[#0e2e50] bg-[#0e2e50]/5' : 'border-border/60 hover:border-[#0e2e50]/30 hover:bg-secondary/10'
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 transition-all duration-500 ${errors.images ? 'bg-ukon-red/20 text-ukon-red' : 'bg-[#0e2e50]/5 text-[#0e2e50] group-hover:bg-[#0e2e50] group-hover:text-white'}`}>
                                        {uploading ? (
                                            <Loader2 size={36} className="animate-spin" />
                                        ) : (
                                            <Upload size={36} />
                                        )}
                                    </div>
                                    <h4 className={`text-2xl font-black ${errors.images ? 'text-ukon-red' : 'text-[#0e2e50]'}`}>
                                        {isDragActive ? 'Drop to Upload' : 'Drag & Drop Media'}
                                    </h4>
                                    {errors.images ? (
                                        <p className="text-ukon-red mt-2 font-bold uppercase tracking-widest text-xs">{errors.images}</p>
                                    ) : (
                                        <p className="text-muted-foreground mt-2 font-medium max-w-xs">
                                            High-resolution photos increase conversion by up to 40%. WEBP, JPG, PNG supported.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Virtual Tour URL</label>
                                        <Input
                                            name="virtual_tour_url"
                                            placeholder="https://matterport.com/..."
                                            value={formData.virtual_tour_url}
                                            onChange={handleInputChange}
                                            className="h-14 rounded-2xl bg-secondary/5 border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Video URL</label>
                                        <Input
                                            name="video_url"
                                            placeholder="https://youtube.com/..."
                                            value={formData.video_url}
                                            onChange={handleInputChange}
                                            className="h-14 rounded-2xl bg-secondary/5 border-border"
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.images.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="font-black text-[#0e2e50] text-lg uppercase tracking-wider">Asset Gallery ({formData.images.length})</h4>
                                        <p className="text-[10px] font-black text-ukon-green bg-ukon-green/10 px-3 py-1 rounded-full uppercase tracking-widest">Auto-compressed (WebP)</p>
                                    </div>
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                        modifiers={[restrictToFirstScrollableAncestor]}
                                    >
                                        <SortableContext
                                            items={formData.images}
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                {formData.images.map((url, index) => (
                                                    <SortableImage
                                                        key={url}
                                                        url={url}
                                                        index={index}
                                                        onRemove={removeImage}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 'amenities' && (
                        <motion.div
                            key="amenities"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            {/* Property Description */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Property Description</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateDescriptionWithAI}
                                        disabled={aiGeneratingDescription}
                                        className="rounded-2xl gap-2 font-bold"
                                    >
                                        {aiGeneratingDescription ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Sparkles size={16} />
                                        )}
                                        Generate with AI
                                    </Button>
                                </div>
                                <DescriptionEditor
                                    content={formData.description_json}
                                    onChange={(json) => {
                                        const plainText = tiptapJsonToPlainText(json);
                                        setFormData(prev => ({
                                            ...prev,
                                            description_json: json,
                                            description_summary: plainText,
                                        }));
                                        setHasChanges(true);
                                    }}
                                    error={errors.description_summary}
                                />
                                {errors.description_summary && <p className="text-xs text-ukon-red font-bold ml-2">{errors.description_summary}</p>}
                            </div>

                            {/* Nearby Points of Interest */}
                            <div className="p-8 bg-secondary/5 rounded-[2.5rem] border border-border/50">
                                {POIEditor ? (
                                    <POIEditor
                                        pois={formData.nearby_amenities}
                                        onChange={(pois) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                nearby_amenities: pois
                                            }))
                                        }
                                        loading={poiLoading}
                                    />
                                ) : (
                                    <div className="text-sm text-muted-foreground">POI Editor not available</div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Interior Features</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'smart-home', label: 'Smart Home System', icon: Wifi },
                                            { id: 'hardwood', label: 'Hardwood Floors', icon: Home },
                                            { id: 'ac', label: 'Central AC', icon: Wind },
                                            { id: 'fireplace', label: 'Fireplace', icon: Sun },
                                            { id: 'home-theater', label: 'Home Theater', icon: Tv },
                                        ].map(feat => (
                                            <button
                                                key={feat.id}
                                                onClick={() => toggleFeature('interior', feat.id)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${formData.interior_features.includes(feat.id)
                                                    ? 'border-[#0e2e50] bg-[#0e2e50]/5 shadow-lg shadow-[#0e2e50]/5'
                                                    : 'border-border/50 bg-white hover:border-[#0e2e50]/20'
                                                    }`}
                                            >
                                                <feat.icon size={20} className={formData.interior_features.includes(feat.id) ? 'text-[#000]' : 'text-[#000]'} />
                                                <span className="font-bold text-[#0e2e50]">{feat.label}</span>
                                                {formData.interior_features.includes(feat.id) && (
                                                    <div className="ml-auto w-6 h-6 bg-[#0e2e50] rounded-full flex items-center justify-center text-white">
                                                        <Check size={14} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Outdoor Life</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'pool', label: 'Private Pool', icon: Waves },
                                            { id: 'garden', label: 'Lush Garden', icon: Trees },
                                            { id: 'outdoor-kitchen', label: 'Outdoor Kitchen', icon: ShoppingBag },
                                            { id: 'deck', label: 'Terrace Deck', icon: Building2 },
                                            { id: 'sea-view', label: 'Ocean View', icon: Waves },
                                        ].map(feat => (
                                            <button
                                                key={feat.id}
                                                onClick={() => toggleFeature('outdoor', feat.id)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${formData.outdoor_features.includes(feat.id)
                                                    ? 'border-ukon-green bg-ukon-green/5 shadow-lg shadow-ukon-green/5'
                                                    : 'border-border/50 bg-white hover:border-ukon-green/20'
                                                    }`}
                                            >
                                                <feat.icon size={20} className={formData.outdoor_features.includes(feat.id) ? 'text-[#000]' : 'text-[#000]'} />
                                                <span className="font-bold text-[#0e2e50]">{feat.label}</span>
                                                {formData.outdoor_features.includes(feat.id) && (
                                                    <div className="ml-auto w-6 h-6 bg-ukon-green rounded-full flex items-center justify-center text-white">
                                                        <Check size={14} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Lifestyle Tags</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'Waterfront', label: 'Waterfront', icon: Waves },
                                            { id: 'Beachfront', label: 'Beachfront', icon: Waves },
                                            { id: 'City Center', label: 'City Center', icon: Building2 },
                                            { id: 'Gated', label: 'Gated', icon: ShieldCheck },
                                            { id: 'Pool', label: 'Pool', icon: Waves },
                                            { id: 'Garden', label: 'Garden', icon: Trees },
                                        ].map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    const updated = formData.lifestyle_tags.includes(tag.id)
                                                        ? formData.lifestyle_tags.filter(t => t !== tag.id)
                                                        : [...formData.lifestyle_tags, tag.id];
                                                    setFormData(prev => ({ ...prev, lifestyle_tags: updated }));
                                                }}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${formData.lifestyle_tags.includes(tag.id)
                                                    ? 'border-ukon-navy bg-ukon-navy/5 shadow-lg shadow-ukon-navy/5'
                                                    : 'border-border/50 bg-white hover:border-ukon-navy/20'
                                                    }`}
                                            >
                                                <tag.icon size={18} className={formData.lifestyle_tags.includes(tag.id) ? 'text-[#0e2e50]' : 'text-[#0e2e50]'} />
                                                <span className="text-sm font-bold text-[#0e2e50]">{tag.label}</span>
                                                {formData.lifestyle_tags.includes(tag.id) && (
                                                    <div className="ml-auto w-5 h-5 bg-ukon-navy rounded-full flex items-center justify-center text-white">
                                                        <Check size={12} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'performance' && (
                        <motion.div
                            key="performance"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            {/* Listing Summary Card */}
                            <div className="bg-white border border-border rounded-[2rem] p-6 md:p-8">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    {/* Image */}
                                    <div className="flex-shrink-0 w-32 h-32 bg-muted rounded-xl overflow-hidden shadow-sm" style={{ backgroundImage: `url(${formData.image_url || (formData.images?.[0] || '')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

                                    {/* Content */}
                                    <div className="flex-grow">
                                        {/* Title & Status Row */}
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div>
                                                <h3 className="text-2xl font-black text-[#0e2e50]">{formData.title || 'Untitled'}</h3>
                                                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1"><MapPin size={14} /><span>{formData.address || 'Address not provided'}</span></div>
                                            </div>
                                            {formData.status && (
                                                <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex-shrink-0 ${
                                                    formData.status === 'active' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                                                    formData.status === 'draft' ? 'bg-slate-50 border border-slate-200 text-slate-600' :
                                                    formData.status === 'under_offer' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                                                    formData.status === 'sold' ? 'bg-slate-100 border border-slate-300 text-slate-700' :
                                                    'bg-slate-50 border border-slate-200 text-slate-600'
                                                }`}>
                                                    {formData.status === 'draft' ? 'Draft' : formData.status === 'active' ? 'Active' : formData.status === 'under_offer' ? 'Under Offer' : formData.status === 'sold' ? 'Sold' : 'Archived'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="mb-4">
                                            <p className="text-[#0e2e50] font-black text-2xl">{currency} {formatPriceNumber(formData.price || '0', currency)}</p>
                                        </div>

                                        {/* Key Specs */}
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            {formData.bedrooms && (
                                                <div className="flex items-center gap-2"><Bed size={16} className="text-muted-foreground" /><span className="font-bold">{formData.bedrooms} {parseInt(formData.bedrooms) === 1 ? 'Bedroom' : 'Bedrooms'}</span></div>
                                            )}
                                            {formData.bathrooms && (
                                                <div className="flex items-center gap-2"><Bath size={16} className="text-muted-foreground" /><span className="font-bold">{formData.bathrooms} {parseInt(formData.bathrooms) === 1 ? 'Bathroom' : 'Bathrooms'}</span></div>
                                            )}
                                            {formData.m2 && (
                                                <div className="flex items-center gap-2"><Square size={16} className="text-muted-foreground" /><span className="font-bold">{formData.m2} m²</span></div>
                                            )}
                                            <div className="flex items-center gap-2"><ImageIcon size={16} className="text-muted-foreground" /><span className="font-bold">{formData.images?.length || 0} {formData.images?.length === 1 ? 'Image' : 'Images'}</span></div>
                                        </div>

                                        {/* Listing Code */}
                                        {formData.listing_code && (
                                            <p className="text-[10px] text-muted-foreground/60 font-medium mt-4 uppercase tracking-wider">Code: {formData.listing_code}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left: Preview & Market Intel (2/3) */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Live Listing Preview */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4 ml-1">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40">Listing Preview</h3>
                                            {!showPreview && (
                                                <button
                                                    onClick={() => setShowPreview(true)}
                                                    className="text-xs font-bold text-[#0e2e50] hover:text-[#0e2e50]/70 uppercase tracking-wider transition-colors"
                                                >
                                                    View Preview
                                                </button>
                                            )}
                                        </div>
                                        {showPreview && (
                                            <div className="bg-white rounded-[2rem] overflow-hidden border border-border/30 max-h-[600px] overflow-y-auto shadow-sm">
                                                <ListingPreview
                                                    data={formData}
                                                    onClose={() => setShowPreview(false)}
                                                    embedded={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Market Intelligence */}
                                    {formData.m2 && (
                                        <MarketIntelligence
                                            price={parseFloat(formData.price) || 0}
                                            areaM2={parseInt(formData.m2) || 1}
                                            areaPricePerM2={8500} // Mock data
                                            pricePerM2={(parseFloat(formData.price) || 0) / (parseInt(formData.m2) || 1)}
                                            isSimulated={true}
                                        />
                                    )}
                                </div>

                                {/* Right: Performance & Suggestions (1/3) */}
                                <div className="space-y-6">
                                    {/* Performance Snapshot */}
                                    <PerformanceSnapshot
                                        status={formData.status}
                                        daysOnMarket={performanceMetrics.daysOnMarket}
                                        views={performanceMetrics.views}
                                        saves={performanceMetrics.saves}
                                        inquiries={performanceMetrics.inquiries}
                                        lastUpdated={lastSaved?.toISOString()}
                                        performanceScore={completionScore.percent}
                                    />

                                    {/* Optimization Suggestions */}
                                    <OptimizationSuggestions
                                        suggestions={optimizationSuggestions}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                    </div>
                </div>

                {/* Unsaved Changes Indicator - Sticky Save Bar */}
                {hasChanges && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 shadow-lg flex items-center justify-between max-w-7xl mx-auto">
                        <span className="text-sm font-bold text-[#0e2e50]">Unsaved changes</span>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFormData(formData);
                                    setHasChanges(false);
                                }}
                                className="rounded-xl"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-[#0e2e50] text-white rounded-xl"
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // CREATE MODE: Original Onboarding Wizard
    return (
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-border max-w-5xl mx-auto overflow-hidden">
            {/* Header with Phase Indicator */}
            <div className="space-y-8 mb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-[#0e2e50] tracking-tight">Create Listing</h2>
                        <p className="text-muted-foreground font-medium mt-2">Elevate your property to a premium standard.</p>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        {/* Listing Strength Score */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-lg border border-border/40">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Listing Strength</span>
                            <span className="text-sm font-black text-[#0e2e50]">{animatedStrengthScore} / 100</span>
                        </div>

                        {/* Phase Indicator */}
                        <PhaseIndicator
                            phases={steps}
                            currentPhaseId={currentStep}
                            onPhaseChange={(phaseId) => {
                                setCurrentStep(phaseId as Step);
                            }}
                            showLabel={true}
                        />
                    </div>
                </div>

                {/* Auto-save indicator */}
                {savedAgo && (
                    <div className="text-xs text-muted-foreground/70">✓ {savedAgo}</div>
                )}
            </div>

            <div className="min-h-[500px]">
                <>
                    {currentStep === 'basic' && (
                        <motion.div key="basic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <div className="grid grid-cols-1 gap-8">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1">Property Title</label>
                                        <Input
                                            name="title"
                                            placeholder="e.g. Modern Minimalist Villa with Pool"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            className={`h-16 rounded-[1.5rem] bg-secondary/5 font-bold text-lg px-6 ${errors.title ? 'border-ukon-red ring-1 ring-ukon-red' : 'border-border'}`}
                                        />
                                        {errors.title && <p className="text-xs text-ukon-red font-bold ml-2">{errors.title}</p>}
                                    </div>
                                    <div className="space-y-1.5 w-52">
                                        <label className="text-[10px] font-black text-muted-foreground/60 ml-1 uppercase tracking-[0.15em]">System ID</label>
                                        <div className="h-16 rounded-[1.5rem] bg-[#0e2e50]/[0.04] border border-[#0e2e50]/[0.08] flex items-center justify-center gap-2 relative">
                                            <span className="font-mono text-sm font-bold text-[#0e2e50]/80 tracking-wider">{formData.listing_code}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCode = generateListingCode(formData.countryCode, formData.price_type, formData.property_type);
                                                    if (newCode) setFormData(prev => ({ ...prev, listing_code: newCode }));
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded hover:bg-[#0e2e50]/[0.06] transition-colors"
                                                title="Regenerate listing code"
                                            >
                                                <RefreshCw size={12} className="text-muted-foreground/40" />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground/40 ml-1 tracking-wide">Country + Type + Unique ID</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#0e2e50] ml-1 uppercase">Type</label>
                                        <Select value={formData.property_type} onValueChange={(v) => handleSelectChange('property_type', v)}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-secondary/5 font-bold border-border">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {['Villa', 'House', 'Apartment', 'Penthouse', 'Commercial', 'Land'].map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1">Listed For</label>
                                        <Select value={formData.price_type} onValueChange={(v) => handleSelectChange('price_type', v)}>
                                            <SelectTrigger className="h-16 rounded-[1.5rem] bg-secondary/5 border-border font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                <SelectItem value="sale">For Sale</SelectItem>
                                                <SelectItem value="rent">For Rent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Address</label>
                                    <AddressAutocomplete
                                        value={formData.address}
                                        onChange={(v) => setFormData(prev => ({ ...prev, address: v }))}
                                        onSelect={async (result) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                address: result.formattedAddress,
                                                formatted_address: result.formattedAddress,
                                                latitude: result.latitude,
                                                longitude: result.longitude,
                                                countryCode: result.countryCode || '',
                                                nearby_amenities: [],
                                            }));

                                            setPoiLoading(true);
                                            toast.info('Finding nearby amenities...');
                                            try {
                                                const pois = await fetchNearbyPOIs(
                                                    result.latitude,
                                                    result.longitude
                                                );
                                                setFormData(prev => ({
                                                    ...prev,
                                                    nearby_amenities: pois,
                                                    poi_fetched_at: new Date().toISOString(),
                                                    poi_source: 'osm'
                                                }));

                                                if (pois.length === 0) {
                                                    toast.warning(
                                                        'No nearby amenities found in this area'
                                                    );
                                                } else {
                                                    toast.success(
                                                        `Found ${pois.length} nearby points of interest`
                                                    );
                                                }
                                            } catch (error) {
                                                console.error('POI fetch error:', error);
                                                toast.error(
                                                    'Could not load nearby amenities. You can add them manually.'
                                                );
                                            } finally {
                                                setPoiLoading(false);
                                            }
                                        }}
                                        error={errors.address}
                                        placeholder="Start typing your property address..."
                                        disabled={poiLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Price</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            data-currency-selector=""
                                            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg hover:bg-[#0e2e50]/10 transition-colors text-[#0e2e50] font-bold text-sm cursor-pointer z-10"
                                            title="Click to change currency"
                                        >
                                            {currency}
                                        </button>
                                        <Input
                                            name="price"
                                            type="text"
                                            placeholder={getPricePlaceholder(currency)}
                                            value={formatPriceNumber(formData.price, currency)}
                                            onChange={handlePriceChange}
                                            className="pl-16 h-16 rounded-[1.5rem] bg-secondary/5 border-border text-2xl font-black text-[#0e2e50] placeholder:opacity-50 flex items-center"
                                            inputMode="numeric"
                                        />
                                        {/* Currency Selector Dropdown */}
                                        {showCurrencyDropdown && (
                                            <div data-currency-selector="" className="absolute left-4 top-full mt-2 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden min-w-[120px]">
                                                {availableCurrencies.map((curr) => (
                                                    <button
                                                        key={curr}
                                                        type="button"
                                                        data-currency-selector=""
                                                        onClick={() => {
                                                            const rawPrice = parseFloat(formData.price) || 0;
                                                            const priceInEUR = convertToEUR(rawPrice, currency);
                                                            const newPrice = convert(priceInEUR, curr);
                                                            setFormData(prev => ({ ...prev, price: Math.round(newPrice).toString() }));
                                                            setCurrency(curr);
                                                            setShowCurrencyDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/30 last:border-b-0 font-bold text-sm ${
                                                            currency === curr
                                                                ? 'bg-[#0e2e50]/10 text-[#0e2e50]'
                                                                : 'hover:bg-secondary/30 text-foreground'
                                                        }`}
                                                    >
                                                        {curr}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'details' && (
                        <SpecificationsStep
                            formData={formData}
                            handleInputChange={handleInputChange}
                            handleSelectChange={handleSelectChange}
                        />
                    )}

                    {currentStep === 'media' && (
                        <motion.div key="media" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Media Assets</label>
                                    <Info size={16} className="text-muted-foreground" />
                                </div>

                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-[3rem] p-16 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-pointer group ${errors.images ? 'border-ukon-red bg-ukon-red/5' : isDragActive ? 'border-[#0e2e50] bg-[#0e2e50]/5' : 'border-border/60 hover:border-[#0e2e50]/30 hover:bg-secondary/10'
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 transition-all duration-500 ${errors.images ? 'bg-ukon-red/20 text-ukon-red' : 'bg-[#0e2e50]/5 text-[#0e2e50] group-hover:bg-[#0e2e50] group-hover:text-white'}`}>
                                        {uploading ? (
                                            <Loader2 size={36} className="animate-spin" />
                                        ) : (
                                            <Upload size={36} />
                                        )}
                                    </div>
                                    <h4 className={`text-2xl font-black ${errors.images ? 'text-ukon-red' : 'text-[#0e2e50]'}`}>
                                        {isDragActive ? 'Drop to Upload' : 'Drag & Drop Media'}
                                    </h4>
                                    {errors.images ? (
                                        <p className="text-ukon-red mt-2 font-bold uppercase tracking-widest text-xs">{errors.images}</p>
                                    ) : (
                                        <p className="text-muted-foreground mt-2 font-medium max-w-xs">
                                            High-resolution photos increase conversion by up to 40%. WEBP, JPG, PNG supported.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Virtual Tour URL</label>
                                        <Input
                                            name="virtual_tour_url"
                                            placeholder="https://matterport.com/..."
                                            value={formData.virtual_tour_url}
                                            onChange={handleInputChange}
                                            className="h-14 rounded-2xl bg-secondary/5 border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#0e2e50] ml-1 uppercase tracking-widest">Video URL</label>
                                        <Input
                                            name="video_url"
                                            placeholder="https://youtube.com/..."
                                            value={formData.video_url}
                                            onChange={handleInputChange}
                                            className="h-14 rounded-2xl bg-secondary/5 border-border"
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.images.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="font-black text-[#0e2e50] text-lg uppercase tracking-wider">Asset Gallery ({formData.images.length})</h4>
                                        <p className="text-[10px] font-black text-ukon-green bg-ukon-green/10 px-3 py-1 rounded-full uppercase tracking-widest">Auto-compressed (WebP)</p>
                                    </div>
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                        modifiers={[restrictToFirstScrollableAncestor]}
                                    >
                                        <SortableContext
                                            items={formData.images}
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                {formData.images.map((url, index) => (
                                                    <SortableImage
                                                        key={url}
                                                        url={url}
                                                        index={index}
                                                        onRemove={removeImage}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 'amenities' && (
                        <motion.div key="amenities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                            <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <label className="text-sm font-bold text-[#0e2e50] ml-1">Property Description</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateDescriptionWithAI}
                                        disabled={aiGeneratingDescription}
                                        className="rounded-2xl gap-2 font-bold w-full sm:w-auto"
                                    >
                                        {aiGeneratingDescription ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Sparkles size={16} />
                                        )}
                                        Generate with AI
                                    </Button>
                                </div>
                                <DescriptionEditor
                                    content={formData.description_json}
                                    onChange={(json) => {
                                        const plainText = tiptapJsonToPlainText(json);
                                        setFormData(prev => ({
                                            ...prev,
                                            description_json: json,
                                            description_summary: plainText,
                                        }));
                                        setHasChanges(true);
                                    }}
                                    error={errors.description_summary}
                                />
                                {errors.description_summary && <p className="text-xs text-ukon-red font-bold ml-2">{errors.description_summary}</p>}
                            </div>

                            <div className="p-8 bg-secondary/5 rounded-[2.5rem] border border-border/50">
                                {POIEditor ? (
                                    <POIEditor
                                        pois={formData.nearby_amenities}
                                        onChange={(pois) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                nearby_amenities: pois
                                            }))
                                        }
                                        loading={poiLoading}
                                    />
                                ) : (
                                    <div className="text-sm text-muted-foreground">POI Editor not available</div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Interior Features</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'smart-home', label: 'Smart Home System', icon: Wifi },
                                            { id: 'hardwood', label: 'Hardwood Floors', icon: Home },
                                            { id: 'ac', label: 'Central AC', icon: Wind },
                                            { id: 'fireplace', label: 'Fireplace', icon: Sun },
                                            { id: 'home-theater', label: 'Home Theater', icon: Tv },
                                        ].map(feat => (
                                            <button
                                                key={feat.id}
                                                onClick={() => toggleFeature('interior', feat.id)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${formData.interior_features.includes(feat.id)
                                                    ? 'border-[#0e2e50] bg-[#0e2e50]/5 shadow-lg shadow-[#0e2e50]/5'
                                                    : 'border-border/50 bg-white hover:border-[#0e2e50]/20'
                                                    }`}
                                            >
                                                <feat.icon size={20} className={formData.interior_features.includes(feat.id) ? 'text-[#000]' : 'text-[#000]'} />
                                                <span className="font-bold text-[#0e2e50]">{feat.label}</span>
                                                {formData.interior_features.includes(feat.id) && (
                                                    <div className="ml-auto w-6 h-6 bg-[#0e2e50] rounded-full flex items-center justify-center text-white">
                                                        <Check size={14} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Outdoor Life</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'pool', label: 'Private Pool', icon: Waves },
                                            { id: 'garden', label: 'Lush Garden', icon: Trees },
                                            { id: 'outdoor-kitchen', label: 'Outdoor Kitchen', icon: ShoppingBag },
                                            { id: 'deck', label: 'Terrace Deck', icon: Building2 },
                                            { id: 'sea-view', label: 'Ocean View', icon: Waves },
                                        ].map(feat => (
                                            <button
                                                key={feat.id}
                                                onClick={() => toggleFeature('outdoor', feat.id)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${formData.outdoor_features.includes(feat.id)
                                                    ? 'border-ukon-green bg-ukon-green/5 shadow-lg shadow-ukon-green/5'
                                                    : 'border-border/50 bg-white hover:border-ukon-green/20'
                                                    }`}
                                            >
                                                <feat.icon size={20} className={formData.outdoor_features.includes(feat.id) ? 'text-[#000]' : 'text-[#000]'} />
                                                <span className="font-bold text-[#0e2e50]">{feat.label}</span>
                                                {formData.outdoor_features.includes(feat.id) && (
                                                    <div className="ml-auto w-6 h-6 bg-ukon-green rounded-full flex items-center justify-center text-white">
                                                        <Check size={14} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 ml-1">Lifestyle Tags</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'Waterfront', label: 'Waterfront', icon: Waves },
                                            { id: 'Beachfront', label: 'Beachfront', icon: Waves },
                                            { id: 'City Center', label: 'City Center', icon: Building2 },
                                            { id: 'Gated', label: 'Gated', icon: ShieldCheck },
                                            { id: 'Pool', label: 'Pool', icon: Waves },
                                            { id: 'Garden', label: 'Garden', icon: Trees },
                                        ].map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    const updated = formData.lifestyle_tags.includes(tag.id)
                                                        ? formData.lifestyle_tags.filter(t => t !== tag.id)
                                                        : [...formData.lifestyle_tags, tag.id];
                                                    setFormData(prev => ({ ...prev, lifestyle_tags: updated }));
                                                }}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${formData.lifestyle_tags.includes(tag.id)
                                                    ? 'border-ukon-navy bg-ukon-navy/5 shadow-lg shadow-ukon-navy/5'
                                                    : 'border-border/50 bg-white hover:border-ukon-navy/20'
                                                    }`}
                                            >
                                                <tag.icon size={18} className={formData.lifestyle_tags.includes(tag.id) ? 'text-[#0e2e50]' : 'text-[#0e2e50]'} />
                                                <span className="text-sm font-bold text-[#0e2e50]">{tag.label}</span>
                                                {formData.lifestyle_tags.includes(tag.id) && (
                                                    <div className="ml-auto w-5 h-5 bg-ukon-navy rounded-full flex items-center justify-center text-white">
                                                        <Check size={12} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'review' && (
                        <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-3 gap-8">
                            {/* Left: Preview (2/3) */}
                            <div className="col-span-2">
                                <div className="p-6 bg-secondary/5 rounded-[2.5rem] border border-border/50">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 mb-4 ml-1">Live Preview</h3>
                                    <div className="bg-white rounded-2xl overflow-hidden border border-border/30 max-h-[600px] overflow-y-auto">
                                        <ListingPreview data={formData} onClose={() => {}} embedded={true} />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Score & Actions (1/3) */}
                            <div className="col-span-1">
                                <div className="space-y-6">
                                    {/* Completion Score Card */}
                                    <div className="p-6 bg-gradient-to-br from-[#0e2e50]/5 to-ukon-green/5 rounded-[2rem] border border-border/50">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#0e2e50]/40 mb-4">Quality Score</h4>
                                        <div className="mb-4">
                                            <div className="text-3xl font-black text-[#0e2e50]">{completionScore.percent}%</div>
                                            <p className="text-xs text-muted-foreground mt-1">{completionScore.score} / {completionScore.maxScore} points</p>
                                        </div>
                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-ukon-green to-[#0e2e50] transition-all" style={{ width: `${completionScore.percent}%` }} />
                                        </div>
                                    </div>

                                    {/* Missing Items */}
                                    {completionScore.missing.length > 0 && (
                                        <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-200">
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-900 mb-3">Suggestions to Improve</h4>
                                            <ul className="space-y-2">
                                                {completionScore.missing.slice(0, 5).map((item, i) => (
                                                    <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mt-1 flex-shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Save Draft Button */}
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            saveDraft(formData);
                                            toast.success('Draft saved to your device');
                                        }}
                                        className="w-full h-12 rounded-xl border-[#0e2e50] text-[#0e2e50] font-bold hover:bg-[#0e2e50]/5"
                                    >
                                        💾 Save Draft
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </>
            </div>

            <div className="mt-12 pt-8 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 'basic' || loading}
                        className="h-16 px-8 rounded-2xl gap-3 font-bold text-[#0e2e50] hover:bg-secondary/20"
                    >
                        <ChevronLeft size={20} />
                        Back
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="h-16 px-8 rounded-2xl gap-3 font-bold text-[#0e2e50]/70 hover:bg-secondary/15"
                    >
                        <FileText size={18} />
                        Save Draft
                    </Button>
                </div>

                {(currentStep === 'performance' || currentStep === 'review') ? (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || uploading}
                        className="h-16 px-12 rounded-2xl gap-3 bg-ukon-green hover:bg-ukon-green/90 text-white font-black text-lg shadow-2xl shadow-ukon-green/20"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Check size={24} />}
                        Publish Listing
                    </Button>
                ) : currentStep === 'amenities' ? (
                    <Button
                        onClick={nextStep}
                        disabled={loading || uploading}
                        className="h-16 px-12 rounded-2xl gap-3 bg-[#0e2e50] hover:bg-[#0e2e50]/90 text-white font-black text-lg shadow-2xl shadow-[#0e2e50]/20"
                    >
                        Review & Publish
                        <ChevronRight size={20} />
                    </Button>
                ) : (
                    <Button
                        onClick={nextStep}
                        disabled={loading || uploading}
                        className="h-16 px-12 rounded-2xl gap-3 bg-[#0e2e50] hover:bg-[#0e2e50]/90 text-white font-black text-lg shadow-2xl shadow-[#0e2e50]/20"
                    >
                        Next Step
                        <ChevronRight size={20} />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default AddPropertyForm;
