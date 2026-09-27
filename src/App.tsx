import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { GreenHillLoader } from "@/components/brand/GreenHillLoader";
import { BrandIntro } from "@/components/brand/BrandIntro";
import { introState } from "@/components/brand/introState";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ContentProvider } from "@/content/ContentContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { trackPageView } from "@/lib/analytics";
import { useLanguage } from "@/contexts/LanguageContext";

// Route-based code splitting — each page loads on demand
const Index = lazy(() => import("./pages/Index"));
const Properties = lazy(() => import("./pages/Properties"));
const Private = lazy(() => import("./pages/Private"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Enquire = lazy(() => import("./pages/Enquire"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BuyingInLombok = lazy(() => import("./pages/BuyingInLombok"));
const WhyLombok = lazy(() => import("./pages/WhyLombok"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
// Green Hill Admin: one lazily loaded chunk, nothing admin-related ships with public pages.
const AdminApp = lazy(() => import("./admin/AdminApp"));
// Developer tool only: the invoice holds personal payment details and must
// never ship in a production build (the PDF script imports it directly).
const Invoice = import.meta.env.DEV ? lazy(() => import("./pages/Invoice")) : null;
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** GA4 / Meta Pixel page views; does nothing unless Green Hill's IDs are configured. */
function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const stripLang = (path: string) => {
      const parts = path.split("/").filter(Boolean);
      if (parts[0] === "en" || parts[0] === "id" || parts[0] === "nl" || parts[0] === "es") {
        return `/${parts.slice(1).join("/")}`;
      }
      return path;
    };

    const prevRest = stripLang(prevPathRef.current);
    const nextRest = stripLang(pathname);
    prevPathRef.current = pathname;

    // Language-only swap (e.g. /en/properties → /id/properties) — keep scroll.
    if (prevRest === nextRest) return;

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
/**
 * The inherited agent dashboard (/dashboard) and admin panel (/dashboard/admin)
 * are retired. Old links land in the Green Hill Admin instead.
 */
function AdminRedirect() {
  const { language } = useLanguage();
  return <Navigate to={`/${language}/admin`} replace />;
}

/**
 * Inherited marketplace workflows (agent directory, buyer accounts, agent
 * partner sign-up, buyer/agent messaging) have no place in Green Hill. Their pages stay on disk
 * but are no longer routable; old links land on the homepage.
 */
function HomeRedirect() {
  const { language } = useLanguage();
  return <Navigate to={`/${language}`} replace />;
}

function PageLoader() {
  // The first page is ready when its code has arrived and this loader leaves.
  useEffect(() => () => introState.markPageReady(), []);
  // Under the cold-load intro, stay blank rather than stacking a second loader.
  if (introState.active) return <div className="min-h-screen" style={{ background: "#f1ede5" }} />;
  return <GreenHillLoader />;
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
      {Invoice ? <Route path="/invoice" element={<Invoice />} /> : null}

      {/* Green Hill Admin */}
      <Route path="/admin/*" element={<AdminRedirect />} />
      <Route path="/:lang/admin/*" element={<AdminApp />} />

      {/* Language-prefixed routes */}
      <Route path="/:lang" element={<Index />} />
      <Route path="/:lang/properties" element={<Properties />} />
      <Route path="/:lang/private" element={<Private />} />
      <Route path="/:lang/property/:id" element={<PropertyDetail />} />
      <Route path="/:lang/private/:id" element={<PropertyDetail teaser />} />
      <Route path="/:lang/enquire" element={<Enquire />} />
      <Route path="/:lang/about" element={<About />} />
      <Route path="/:lang/network" element={<HomeRedirect />} />
      <Route path="/:lang/partners" element={<HomeRedirect />} />
      <Route path="/:lang/intelligence" element={<Blog />} />
      <Route path="/:lang/intelligence/:slug" element={<BlogPost />} />
      <Route path="/:lang/buying-in-lombok" element={<BuyingInLombok />} />
      <Route path="/:lang/why-lombok" element={<WhyLombok />} />
      <Route path="/:lang/login" element={<HomeRedirect />} />
      <Route path="/:lang/dashboard" element={<AdminRedirect />} />
      <Route path="/:lang/dashboard/admin" element={<AdminRedirect />} />
      <Route path="/:lang/account/*" element={<HomeRedirect />} />
      <Route path="/:lang/auth/callback" element={<AuthCallback />} />
      <Route path="/:lang/auth/update-password" element={<UpdatePassword />} />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

/**
 * Green Hill has no visitor accounts. The inherited buyer/agent sign-up panel
 * and its auth context are no longer mounted; the admin has its own session
 * (src/admin/AdminSession.tsx).
 */
function AppContent() {
  return (
    <>
      <BrandIntro />
      <ScrollToTop />
      <RouteTracker />
      <AppRoutes />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ContentProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
      </ContentProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
