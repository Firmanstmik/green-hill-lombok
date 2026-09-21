import { motion } from 'framer-motion';
import {
    X, MapPin, Bed, Bath, Square,
    Home, Waves, Building2, Trees,
    Plus, School, Hospital, ShoppingBag,
    Bus, Plane, Info, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DescriptionRenderer } from '@/components/property/DescriptionRenderer';
import { getEmbedUrl } from '@/lib/video-utils';

interface ListingPreviewProps {
    data: any;
    onClose: () => void;
    embedded?: boolean;
}

const ListingPreview = ({ data, onClose, embedded = false }: ListingPreviewProps) => {
    const formatPrice = (price: string | number) => {
        return `$ ${parseFloat(price.toString() || '0').toLocaleString()}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={embedded ? "bg-white overflow-y-auto" : "fixed inset-0 z-[100] bg-white overflow-y-auto"}
        >
            {!embedded && (
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border px-8 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[#0e2e50]">Live Preview Mode</h2>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Listing: {data.listing_code}</p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-12 h-12 rounded-full hover:bg-black/5"
                    >
                        <X size={24} />
                    </Button>
                </div>
            )}

            <main className="pb-24">
                {/* Hero / Images */}
                <div className="container mx-auto px-4 pt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-[#0e2e50] font-bold uppercase tracking-wider mb-2">
                                <MapPin size={14} />
                                <span>{data.address || 'Location Hidden'}</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
                                {data.title || 'Untitled Property'}
                            </h1>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground text-sm mb-1 uppercase tracking-widest font-bold">List Price</p>
                            <h2 className="text-4xl font-black text-[#0e2e50]">
                                {formatPrice(data.price)}
                                {data.price_type === 'rent' && <span className="text-xl font-normal text-muted-foreground">/mo</span>}
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                        <div className="md:col-span-2 md:row-span-2 relative bg-muted">
                            {data.images?.[0] ? (
                                <img src={data.images[0]} alt="Main" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Info size={48} /></div>
                            )}
                        </div>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-muted relative hidden md:block border border-white/10 overflow-hidden">
                                {data.images?.[i + 1] && (
                                    <img src={data.images[i + 1]} alt="Interior" className="w-full h-full object-cover" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="container mx-auto px-4 mt-16 flex flex-col lg:flex-row gap-16">
                    <div className="lg:w-2/3 space-y-16">
                        {/* Description */}
                        <section>
                            <h3 className="text-2xl font-bold mb-6 text-[#0e2e50]">Description</h3>
                            {data.description_json ? (
                                <DescriptionRenderer json={data.description_json} />
                            ) : (
                                <div className="prose prose-slate max-w-none text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
                                    {data.description_summary || data.description || 'No description provided.'}
                                </div>
                            )}
                        </section>

                        {/* Video Tour */}
                        {data.video_url && getEmbedUrl(data.video_url) && (
                            <section>
                                <h3 className="text-2xl font-bold mb-6 text-[#0e2e50]">Video Tour</h3>
                                <div className="rounded-2xl overflow-hidden border border-border/50 aspect-video">
                                    <iframe
                                        src={getEmbedUrl(data.video_url)!}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title="Property Video Tour"
                                    />
                                </div>
                            </section>
                        )}

                        {/* Specs */}
                        <section className="p-10 bg-secondary/10 rounded-[2.5rem] border border-border">
                            <h3 className="text-2xl font-bold mb-8 text-[#0e2e50]">Property Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {[
                                    { label: 'Bedrooms', value: data.bedrooms, icon: Bed },
                                    { label: 'Bathrooms', value: data.bathrooms, icon: Bath },
                                    { label: 'Area', value: `${data.m2} m²`, icon: Square },
                                    { label: 'Year Built', value: data.year_built, icon: Building2 },
                                ].map(item => (
                                    <div key={item.label} className="space-y-1">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <item.icon size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <div className="text-xl font-black text-[#0e2e50]">{item.value || 'N/A'}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Neighborhood */}
                        {data.neighborhood_description && (
                            <section>
                                <h3 className="text-2xl font-bold mb-6 text-[#0e2e50]">Neighborhood Context</h3>
                                <div className="text-muted-foreground text-lg leading-relaxed">
                                    {data.neighborhood_description}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="lg:w-1/3">
                        <div className="sticky top-32 space-y-6">
                            {/* Company Card */}
                            <div className="p-8 rounded-[2.5rem] bg-[#0e2e50] text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 text-[#0e2e50] font-serif text-sm text-center leading-tight">
                                        Green<br />Hill
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase tracking-wider">Green Hill Agent</h4>
                                        <p className="text-xs text-white/60">Professional Representative</p>
                                    </div>
                                    <div className="ml-auto w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                        <CheckCircle2 size={24} className="text-white" />
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl bg-white text-[#0e2e50] font-black text-lg hover:bg-white/90">
                                    Contact Agent
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </motion.div>
    );
};

export default ListingPreview;
