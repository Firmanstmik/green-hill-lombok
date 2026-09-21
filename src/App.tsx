import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuthPanelProvider, useAuthPanel } from "@/contexts/AuthPanelContext";
import { AuthPanel } from "@/components/auth/AuthPanel";

// Route-based code splitting — each page loads on demand
const Index = lazy(() => import("./pages/Index"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const About = lazy(() => import("./pages/About"));
const Agents = lazy(() => import("./pages/Agents"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BuyingInLombok = lazy(() => import("./pages/BuyingInLombok"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Account = lazy(() => import("./pages/Account"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const BuyerSettings = lazy(() => import("./pages/BuyerSettings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Partners = lazy(() => import("./pages/Partners"));
const Invoice = lazy(() => import("./pages/Invoice"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * RootRedirect handles the initial redirect from / to /:lang/
 * Uses LanguageProvider to determine the default language
 */
function RootRedirect() {
  const { language } = useLanguage();
  return <Navigate to={`/${language}/`} replace />;
}

/**
 * AuthCallbackRedirect handles Supabase email verification links
 * that arrive without a language prefix (/auth/callback → /:lang/auth/callback)
 */
function AuthCallbackRedirect() {
  const { language } = useLanguage();
  const location = useLocation();
  return <Navigate to={`/${language}/auth/callback${location.hash}`} replace />;
}

/**
 * AppRoutes contains all the language-prefixed routes
 * Structure: /:lang/path (where lang is en, id, nl, es)
 */
function PageLoader() {
  return <div className="min-h-screen bg-background" />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Root redirect to language-specific home */}
      <Route path="/" element={<RootRedirect />} />

      {/* Redirect non-prefixed auth callback to language-prefixed version */}
      <Route path="/auth/callback" element={<AuthCallbackRedirect />} />

      {/* Isolated invoice preview / PDF export (not language-routed) */}
      <Route path="/invoice" element={<Invoice />} />

      {/* Language-prefixed routes */}
      <Route path="/:lang" element={<Index />} />
      <Route path="/:lang/properties" element={<Properties />} />
      <Route path="/:lang/property/:id" element={<PropertyDetail />} />
      <Route path="/:lang/about" element={<About />} />
      <Route path="/:lang/network" element={<Agents />} />
      <Route path="/:lang/partners" element={<Partners />} />
      <Route path="/:lang/intelligence" element={<Blog />} />
      <Route path="/:lang/intelligence/:slug" element={<BlogPost />} />
      <Route path="/:lang/buying-in-lombok" element={<BuyingInLombok />} />
      <Route path="/:lang/login" element={<Login />} />
      <Route path="/:lang/dashboard" element={<Dashboard />} />
      <Route path="/:lang/dashboard/admin" element={<AdminDashboard />} />
      <Route path="/:lang/account" element={<Account />} />
      <Route path="/:lang/account/settings" element={<BuyerSettings />} />
      <Route path="/:lang/auth/callback" element={<AuthCallback />} />
      <Route path="/:lang/auth/update-password" element={<UpdatePassword />} />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

function AuthPanelGlobal() {
  const { isAuthPanelOpen, closeAuthPanel, initialMode } = useAuthPanel();
  const { language } = useLanguage();
  const location = useLocation();

  // Only show global variant on non-home pages
  const isHomePage = location.pathname === `/${language}` || location.pathname === '/' || location.pathname === `/${language}/`;

  if (isHomePage) return null;

  return (
    <AuthPanel
      variant="global"
      isOpen={isAuthPanelOpen}
      onClose={closeAuthPanel}
      initialMode={initialMode}
    />
  );
}

function AppContent() {
  return (
    <AuthPanelProvider>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
        <AuthPanelGlobal />
      </AuthProvider>
    </AuthPanelProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
