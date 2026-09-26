import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

const LANGS = ['en', 'id', 'nl', 'es'];

/** Admin routes live under /:lang/admin so they share the site's router. */
export function useAdminPath() {
  const { lang } = useParams();
  const language = lang && LANGS.includes(lang) ? lang : 'en';
  const admin = useCallback((path = '') => `/${language}/admin${path}`, [language]);
  const site = useCallback((path = '') => `/${language}${path}`, [language]);
  return { admin, site, language };
}
