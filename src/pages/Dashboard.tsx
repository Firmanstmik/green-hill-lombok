import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Home,
    PlusCircle,
    Settings,
    LogOut,
    Search,
    Plus,
    Building2,
    Users,
    TrendingUp,
    Star,
    Shield,
    ChevronRight,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardTransition, storeReturnUrl } from '@/components/layout/DashboardTransition';
import AddPropertyForm from '@/components/admin/AddPropertyForm';
import { PropertyListingMenu } from '@/components/admin/PropertyListingMenu';
import SellerSettings from '@/components/settings/SellerSettings';
import DashboardMessages from '@/components/messaging/DashboardMessages';
import { useMessaging, useUnreadCount } from '@/hooks/useMessaging';

type Tab = 'overview' | 'listings' | 'add-new' | 'edit' | 'messages' | 'settings';

const Dashboard = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const { formatPrice, currency } = useCurrency();
    const { userType: resolvedUserType, isAdmin } = useAuth();
    const { flipTo, slideClose, getMotionProps } = useDashboardTransition();

    // Store return URL on mount (before entering dashboard)
    useEffect(() => { storeReturnUrl(); }, []);

    const [properties, setProperties] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
    const [initialEditTab, setInitialEditTab] = useState<'basic' | 'performance'>('basic');
    const lastFetchRef = useRef<number>(0);

    // Lightweight unread count for sidebar badge (no heavy RPC, no conversation data)
    const unreadCount = useUnreadCount();

    // Full messaging state — only activated when messages tab is open
    const messaging = useMessaging();
    const messagingActive = activeTab === 'messages';

    useEffect(() => {
        if (user && messagingActive) messaging.fetchConversations();
    }, [user, messagingActive]);

    const STALE_THRESHOLD = 30_000; // 30 seconds

    const fetchDashboardData = useCallback(async (userId: string, force = false) => {
        // Skip if data was fetched recently (unless forced)
        if (!force && Date.now() - lastFetchRef.current < STALE_THRESHOLD) return;
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProperties(data || []);
            lastFetchRef.current = Date.now();
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate(`/${language}/`);
            } else {
                // Check if user is agent or admin type - only they can access dashboard
                // Use resolved role from AuthContext (DB-backed) with metadata fallback
                const metadataType = user.user_metadata?.user_type;
                const effectiveRole = resolvedUserType || metadataType;
                if (effectiveRole !== 'agent' && effectiveRole !== 'admin') {
                    toast.error('This page is for agents only');
                    navigate(`/${language}/`);
                    return;
                }
                setUser(user);
                fetchDashboardData(user.id, true);
            }
            setLoading(false);
        };

        checkUser();
    }, [navigate, language]);

    // Refresh data when switching back to overview or listings
    useEffect(() => {
        if (user && (activeTab === 'overview' || activeTab === 'listings')) {
            fetchDashboardData(user.id);
        }
    }, [activeTab, user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Logged out successfully');
        navigate(`/${language}/`);
    };

    const handleEditProperty = useCallback((propertyId: string) => {
        setEditingPropertyId(propertyId);
        setActiveTab('edit');
        setInitialEditTab('basic');
    }, []);

    const handleOpenPerformance = useCallback((propertyId: string) => {
        setEditingPropertyId(propertyId);
        setActiveTab('edit');
        setInitialEditTab('performance');
    }, []);

    const navigationItems = [
        { id: 'overview' as Tab, icon: LayoutDashboard, label: t('dashboard.overview') },
        { id: 'listings' as Tab, icon: Home, label: t('dashboard.listings') },
        { id: 'add-new' as Tab, icon: PlusCircle, label: t('dashboard.addNew') },
        { id: 'messages' as Tab, icon: MessageSquare, label: t('dashboard.messages') },
        { id: 'settings' as Tab, icon: Settings, label: t('dashboard.settings') },
    ];

    const recentListings = properties.slice(0, 5);

    if (loading) {
        return (
            <motion.div style={{ perspective: 1200 }} {...getMotionProps()} className="h-screen">
                <div className="h-screen bg-secondary/30 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#0e2e50] border-t-transparent rounded-full animate-spin" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div style={{ perspective: 1200 }} {...getMotionProps()} className="h-screen">
        <div className="h-screen bg-secondary/30 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0e2e50] text-white flex flex-col p-6 shrink-0 relative">
                <div className="mb-10 px-2">
                    <h1 className="text-xl font-bold tracking-tighter text-white">GREEN HILL</h1>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1 font-bold">{t('admin.backToDashboard')}</p>
                </div>

                <nav className="flex-1 space-y-1">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${activeTab === item.id
                                ? 'bg-white text-[#0e2e50] font-bold shadow-lg'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={20} className={activeTab === item.id ? 'text-[#0e2e50] scale-110' : 'group-hover:scale-110 transition-transform'} />
                            {item.label}
                            {item.id === 'messages' && unreadCount > 0 && (
                                <span className={`ml-auto text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 ${
                                    activeTab === item.id
                                        ? 'bg-[#0e2e50] text-white'
                                        : 'bg-white/20 text-white'
                                }`}>
                                    {unreadCount}
                                </span>
                            )}
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white rounded-2xl -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Switch to Admin Panel (admin only) */}
                {isAdmin && (
                    <button
                        onClick={() => flipTo(`/${language}/dashboard/admin`)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all mt-auto mb-1"
                    >
                        <Shield size={20} />
                        {t('admin.title')}
                    </button>
                )}

                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white/60 hover:text-white hover:bg-ukon-red/20 transition-all border border-transparent hover:border-ukon-red/30 ${!isAdmin ? 'mt-auto' : ''}`}
                >
                    <LogOut size={20} />
                    {t('navigation.logout')}
                </button>

                {/* Slide-close handle */}
                <button
                    onClick={slideClose}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-14 bg-white hover:bg-white/90 rounded-full flex items-center justify-center text-[#0e2e50] transition-all z-20 shadow-sm"
                >
                    <ChevronRight size={18} />
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                                    <div>
                                        <h2 className="text-3xl lg:text-4xl font-bold text-[#0e2e50]">{t('dashboard.welcomeBack')}</h2>
                                        <p className="text-muted-foreground mt-2 font-medium">{t('dashboard.propertiesUpdates')}</p>
                                    </div>
                                    <Button
                                        onClick={() => setActiveTab('add-new')}
                                        className="bg-[#0e2e50] text-white gap-2 rounded-2xl h-14 px-8 shadow-xl hover:bg-[#0e2e50]/90 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Plus size={20} />
                                        {t('dashboard.publishListing')}
                                    </Button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                    {[
                                        { label: t('dashboard.totalListings'), value: statsLoading ? '...' : properties.length.toString(), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                                        { label: t('dashboard.activeLeads'), value: '0', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
                                        { label: t('dashboard.views30d'), value: '0', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="p-8 rounded-[2rem] border border-border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-bl-[4rem] -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform`} />
                                            <div className="relative z-10">
                                                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                                                    <stat.icon size={24} />
                                                </div>
                                                <span className="text-muted-foreground text-sm font-bold uppercase tracking-wider">{stat.label}</span>
                                                <div className="text-4xl font-bold mt-2 text-[#0e2e50]">{stat.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table (Summary) */}
                                <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden mb-12">
                                    <div className="p-8 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <h3 className="font-bold text-xl text-[#0e2e50]">{t('dashboard.recentListings')}</h3>
                                        <div className="relative w-full sm:w-72">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <Input placeholder={t('dashboard.filterByAddress')} className="pl-12 h-11 rounded-2xl bg-secondary/30 border-none text-sm focus:ring-1 focus:ring-[#0e2e50]/10" />
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[#0e2e50]/[0.02]">
                                                <tr>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Property Details</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pricing</th>
                                                    <th className="px-8 py-5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Featured</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Options</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {recentListings.length > 0 ? (
                                                    recentListings.map((p) => (
                                                        <tr key={p.id} className="hover:bg-secondary/5 transition-colors group cursor-pointer" onClick={() => handleOpenPerformance(p.id)}>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-16 h-16 bg-muted rounded-2xl bg-cover bg-center shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${p.image_url || p.image})` }} />
                                                                    <div>
                                                                        <div className="font-bold text-base text-[#0e2e50]">{p.title}</div>
                                                                        <div className="text-xs text-muted-foreground font-medium mt-0.5">{p.address}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${p.status === 'rent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {p.status || p.price_type || 'Published'}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 font-bold text-[#0e2e50]">{formatPrice(p.price || 0, currency, language)}</td>
                                                            <td className="px-8 py-6 text-center">
                                                                {p.featured ? (
                                                                    <Star size={18} className="fill-amber-400 text-amber-400 mx-auto" />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <PropertyListingMenu property={p} onRefresh={() => fetchDashboardData(user.id, true)} onEdit={handleEditProperty} />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-8 py-12 text-center text-muted-foreground font-medium">
                                                            {t('dashboard.noPropertiesYet')}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-6 bg-secondary/10 border-t border-border text-center">
                                        <button
                                            onClick={() => setActiveTab('listings')}
                                            className="text-sm font-bold text-[#0e2e50] hover:underline"
                                        >
                                            {t('dashboard.viewAll')} {properties.length} {t('dashboard.properties')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'add-new' && (
                            <motion.div
                                key="add-new"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="mb-10">
                                    <h2 className="text-3xl font-bold text-[#0e2e50]">{t('dashboard.publishNewProperty')}</h2>
                                    <p className="text-muted-foreground mt-2 font-medium">{t('dashboard.fillDetails')}</p>
                                </div>
                                <AddPropertyForm onComplete={() => { fetchDashboardData(user.id, true); setActiveTab('listings'); }} />
                            </motion.div>
                        )}

                        {activeTab === 'edit' && editingPropertyId && (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <AddPropertyForm
                                    propertyId={editingPropertyId}
                                    initialTab={initialEditTab}
                                    onComplete={() => {
                                        setEditingPropertyId(null);
                                        setActiveTab('listings');
                                        setInitialEditTab('basic');
                                        fetchDashboardData(user.id, true);
                                    }}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'listings' && (
                            <motion.div
                                key="listings"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-8"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-[#0e2e50]">{t('dashboard.allListings')}</h2>
                                        <p className="text-muted-foreground mt-2 font-medium">{t('dashboard.manageListings')}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <Input placeholder={t('dashboard.searchListings')} className="pl-12 h-12 rounded-2xl bg-white border-border shadow-sm focus:ring-1 focus:ring-[#0e2e50]/20" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[#0e2e50]/[0.02]">
                                                <tr>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Property Details</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pricing</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location</th>
                                                    <th className="px-8 py-5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Featured</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Options</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {properties.length > 0 ? (
                                                    properties.map((p) => (
                                                        <tr key={p.id} className="hover:bg-secondary/5 transition-colors group cursor-pointer" onClick={() => handleOpenPerformance(p.id)}>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-14 h-14 bg-muted rounded-2xl bg-cover bg-center shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${p.image_url || p.image})` }} />
                                                                    <div>
                                                                        <div className="font-bold text-[#0e2e50]">{p.title}</div>
                                                                        <div className="text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-wider">{p.listing_code || p.listingCode || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${p.status === 'rent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {p.status || p.price_type || 'Published'}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 font-bold text-[#0e2e50]">{formatPrice(p.price || 0, currency, language)}</td>
                                                            <td className="px-8 py-6 text-sm text-muted-foreground font-medium">{p.address}</td>
                                                            <td className="px-8 py-6 text-center">
                                                                {p.featured ? (
                                                                    <Star size={18} className="fill-amber-400 text-amber-400 mx-auto" />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <PropertyListingMenu property={p} onRefresh={() => fetchDashboardData(user.id, true)} onEdit={handleEditProperty} />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-16 text-center text-muted-foreground font-medium">
                                                            {t('dashboard.noPropertiesFound')}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'messages' && user && (
                            <motion.div
                                key="messages"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <DashboardMessages
                                    userId={user.id}
                                    conversations={messaging.conversations}
                                    loadingConversations={messaging.loadingConversations}
                                    messages={messaging.messages}
                                    loadingMessages={messaging.loadingMessages}
                                    activeConversationId={messaging.activeConversationId}
                                    onSelect={(id) => {
                                        messaging.setActiveConversationId(id);
                                        messaging.fetchMessages(id);
                                        messaging.markAsRead(id);
                                    }}
                                    onBack={() => messaging.setActiveConversationId(null)}
                                    onSendReply={(content) =>
                                        messaging.activeConversationId
                                            ? messaging.sendReply(messaging.activeConversationId, content)
                                            : Promise.resolve(false)
                                    }
                                />
                            </motion.div>
                        )}

                        {activeTab === 'settings' && user && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <SellerSettings user={user} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
        </motion.div>
    );
};

export default Dashboard;
