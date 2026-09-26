import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './admin.css';
import { AdminSessionProvider, useAdminSession } from './AdminSession';
import { AdminShell } from './AdminShell';
import { AdminLogin } from './AdminLogin';
import { useAdminPath } from './paths';
import { OverviewPage } from './pages/OverviewPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { PrivatePage } from './pages/PrivatePage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { RelationshipsPage } from './pages/RelationshipsPage';
import { ContentOverviewPage } from './content/ContentOverviewPage';
import { UsersPage } from './users/UsersPage';

// The editor carries Tiptap, dnd-kit, the dropzone, image compression and Mapbox.
// It loads only when an opportunity is opened.
const OpportunityEditorPage = lazy(() => import('./editor/OpportunityEditorPage'));
// Content editors carry the shipped copy of every page in four languages.
const ContentPageRoute = lazy(() => import('./content/views').then((m) => ({ default: m.ContentPageRoute })));
const SiteSettingsPage = lazy(() => import('./content/views').then((m) => ({ default: m.SiteSettingsPage })));
const SeoSettingsPage = lazy(() => import('./content/views').then((m) => ({ default: m.SeoSettingsPage })));
const NoteEditorPage = lazy(() => import('./pages/NoteEditorPage'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<EditorFallback />}>{children}</Suspense>;
}

function EditorFallback() {
  return (
    <div role="status" aria-live="polite" style={{ padding: '40px 0' }}>
      <span className="gha-skel" style={{ width: 280, height: 28 }} />
      <span className="gha-skel" style={{ width: 180, height: 14, marginTop: 12 }} />
      <span className="gha-sr-only">Opening the editor…</span>
    </div>
  );
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { status } = useAdminSession();
  const { admin } = useAdminPath();
  if (status === 'loading') {
    return (
      <div className="gh-admin" role="status" aria-live="polite" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="gha-meta">Opening Green Hill Admin…</span>
      </div>
    );
  }
  if (status !== 'ready') return <Navigate to={admin('/login')} replace />;
  return <>{children}</>;
}

function BackToOverview() {
  const { admin } = useAdminPath();
  return <Navigate to={admin()} replace />;
}

function SettingsRedirect() {
  const { admin } = useAdminPath();
  return <Navigate to={admin('/settings/site')} replace />;
}

function AccountRedirect() {
  const { admin } = useAdminPath();
  return <Navigate to={admin('/settings/account')} replace />;
}

function useAdminDocument() {
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    robots.setAttribute('data-gh-admin', '');
    document.head.appendChild(robots);
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = 'en';
    return () => {
      robots.remove();
      document.documentElement.lang = previousLang;
    };
  }, []);
}

export default function AdminApp() {
  useAdminDocument();
  return (
    <AdminSessionProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route
          element={
            <RequireAdmin>
              <AdminShell />
            </RequireAdmin>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route
            path="opportunities/new"
            element={
              <Suspense fallback={<EditorFallback />}>
                <OpportunityEditorPage />
              </Suspense>
            }
          />
          <Route
            path="opportunities/:id"
            element={
              <Suspense fallback={<EditorFallback />}>
                <OpportunityEditorPage />
              </Suspense>
            }
          />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="private" element={<PrivatePage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/new" element={<Lazy><NoteEditorPage /></Lazy>} />
          <Route path="notes/:id" element={<Lazy><NoteEditorPage /></Lazy>} />
          <Route path="content" element={<ContentOverviewPage />} />
          <Route path="content/:page" element={<Lazy><ContentPageRoute /></Lazy>} />
          <Route path="relationships" element={<RelationshipsPage />} />
          <Route path="settings" element={<SettingsRedirect />} />
          <Route path="settings/site" element={<Lazy><SiteSettingsPage /></Lazy>} />
          <Route path="settings/seo" element={<Lazy><SeoSettingsPage /></Lazy>} />
          <Route path="settings/account" element={<SettingsPage />} />
          <Route path="settings/integrations" element={<AccountRedirect />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<BackToOverview />} />
        </Route>
      </Routes>
    </AdminSessionProvider>
  );
}
