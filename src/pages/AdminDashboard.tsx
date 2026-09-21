import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, LogOut, ChevronRight, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { useDashboardTransition, storeReturnUrl } from '@/components/layout/DashboardTransition';
import PartnerManagement from '@/components/admin/PartnerManagement';
import ApplicationManagement from '@/components/admin/ApplicationManagement';

type AdminTab = 'partners' | 'applications';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('partners');
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const { flipTo, slideClose, getMotionProps } = useDashboardTransition();

    // Store return URL on mount (before entering dashboard)
    useEffect(() => { storeReturnUrl(); }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Logged out successfully');
        navigate(`/${language}/`);
    };

    const navigationItems = [
        { id: 'partners' as AdminTab, icon: Shield, label: t('admin.partnerManagement') },
        { id: 'applications' as AdminTab, icon: FileText, label: t('admin.applications') },
    ];

    return (
        <AdminGuard>
            <motion.div style={{ perspective: 1200 }} {...getMotionProps()} className="h-screen">
            <div className="h-screen bg-secondary/30 flex">
                {/* Sidebar */}
                <aside className="w-64 bg-[#0e2e50] text-white flex flex-col p-6 shrink-0 relative">
                    <div className="mb-10 px-2">
                        <h1 className="text-xl font-bold tracking-tighter text-white">GREEN HILL</h1>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1 font-bold">{t('admin.title')}</p>
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
                                {activeTab === item.id && (
                                    <motion.div
                                        layoutId="adminActiveTab"
                                        className="absolute inset-0 bg-white rounded-2xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Flip to Agent Dashboard */}
                    <button
                        onClick={() => flipTo(`/${language}/dashboard`)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all mt-auto mb-1"
                    >
                        <LayoutDashboard size={20} />
                        {t('admin.backToDashboard')}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white/60 hover:text-white hover:bg-ukon-red/20 transition-all border border-transparent hover:border-ukon-red/30"
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
                            {activeTab === 'partners' && (
                                <motion.div
                                    key="partners"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <PartnerManagement />
                                </motion.div>
                            )}
                            {activeTab === 'applications' && (
                                <motion.div
                                    key="applications"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <ApplicationManagement />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
            </motion.div>
        </AdminGuard>
    );
};

export default AdminDashboard;
