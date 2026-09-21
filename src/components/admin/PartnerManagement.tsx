import { useState, useEffect } from 'react';
import { Shield, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SellerProfile {
    id: string;
    user_id: string;
    agency_name: string | null;
    license_number: string | null;
    is_ukon_partner: boolean;
    profile_image_url: string | null;
    created_at: string;
    user_email: string | null;
}

const PartnerManagement = () => {
    const { t } = useLanguage();
    const [sellers, setSellers] = useState<SellerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toggling, setToggling] = useState<string | null>(null);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        profileId: string;
        agencyName: string;
        currentValue: boolean;
    }>({ open: false, profileId: '', agencyName: '', currentValue: false });

    const fetchSellers = async () => {
        try {
            const { data, error } = await supabase.rpc('get_seller_profiles_admin');

            if (error) throw error;
            setSellers((data as SellerProfile[]) || []);
        } catch (err) {
            console.error('Error fetching sellers:', err);
            toast.error('Failed to load seller profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    const handleToggleRequest = (profile: SellerProfile) => {
        setConfirmDialog({
            open: true,
            profileId: profile.id,
            agencyName: profile.agency_name || profile.user_email || 'Unknown',
            currentValue: profile.is_ukon_partner,
        });
    };

    const handleConfirmToggle = async () => {
        const { profileId, currentValue } = confirmDialog;
        setConfirmDialog(prev => ({ ...prev, open: false }));
        setToggling(profileId);

        try {
            const { error } = await supabase
                .from('seller_profiles')
                .update({ is_ukon_partner: !currentValue })
                .eq('id', profileId);

            if (error) throw error;

            setSellers(prev =>
                prev.map(s =>
                    s.id === profileId
                        ? { ...s, is_ukon_partner: !currentValue }
                        : s
                )
            );

            toast.success(
                currentValue
                    ? 'Partner status revoked'
                    : 'Verified Partner status granted'
            );
        } catch (err) {
            console.error('Error toggling partner status:', err);
            toast.error('Failed to update partner status');
        } finally {
            setToggling(null);
        }
    };

    const filteredSellers = sellers.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            s.agency_name?.toLowerCase().includes(q) ||
            s.user_email?.toLowerCase().includes(q) ||
            s.license_number?.toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#0e2e50]" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-[#0e2e50]">{t('admin.partnerManagement')}</h2>
                    <p className="text-muted-foreground mt-2 font-medium">
                        {sellers.length} {t('admin.allSellers')} &middot; {sellers.filter(s => s.is_ukon_partner).length} verified
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="pl-10 rounded-xl h-12"
                    />
                </div>
            </div>

            {/* Sellers Table */}
            {filteredSellers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Shield size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium">{t('admin.noSellers')}</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_1fr_auto] md:grid-cols-[2fr_2fr_1fr_auto] gap-4 px-8 py-4 border-b border-border">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agency</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</span>
                        <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">License</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">{t('admin.partnerStatus')}</span>
                    </div>

                    {/* Table Rows */}
                    {filteredSellers.map((seller) => (
                        <div
                            key={seller.id}
                            className="grid grid-cols-[1fr_1fr_auto] md:grid-cols-[2fr_2fr_1fr_auto] gap-4 px-8 py-5 border-b border-border last:border-0 items-center hover:bg-secondary/30 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {seller.profile_image_url ? (
                                    <img
                                        src={seller.profile_image_url}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-border"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#0e2e50]/10 flex items-center justify-center shrink-0">
                                        <Shield size={16} className="text-[#0e2e50]/50" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-foreground truncate">
                                        {seller.agency_name || 'Unnamed Agency'}
                                    </p>
                                    {seller.is_ukon_partner && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0e2e50] bg-[#0e2e50]/10 px-2 py-0.5 rounded-full">
                                            <Shield size={10} />
                                            Verified
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground truncate">
                                {seller.user_email || '—'}
                            </p>

                            <p className="hidden md:block text-sm text-muted-foreground truncate">
                                {seller.license_number || '—'}
                            </p>

                            <div className="flex items-center justify-end gap-2">
                                {toggling === seller.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <Switch
                                        checked={seller.is_ukon_partner}
                                        onCheckedChange={() => handleToggleRequest(seller)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmDialog.currentValue
                                ? 'Revoke Verified Partner Status?'
                                : 'Grant Verified Partner Status?'
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.currentValue
                                ? `This will remove the Verified Partner badge from "${confirmDialog.agencyName}". Their listings will no longer display partner verification.`
                                : `This will grant Verified Partner status to "${confirmDialog.agencyName}". Their listings will display the official Green Hill partner badge.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmToggle}
                            className={confirmDialog.currentValue
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : 'bg-[#0e2e50] text-white hover:bg-[#0e2e50]/90'
                            }
                        >
                            {confirmDialog.currentValue ? 'Revoke Partner' : 'Grant Partner'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PartnerManagement;
