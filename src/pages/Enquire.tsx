import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { InvestorProfileForm, type EnquiryOpportunity } from '@/components/enquiry/InvestorProfileForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import { trackContact } from '@/lib/analytics';
import { demoOpportunities as demoProperties } from '@/data/mockData';
import { publicOpportunityByKey } from '@/lib/publicOpportunities';
import { fetchPrivateTeaser } from '@/lib/privateTeasers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { applyPageSeo } from '@/lib/seo';

/**
 * Investor profile (brief §9): "I've got £150,000 to invest in Lombok. Where
 * would you put it?" — the conversation Green Hill wants to start.
 * `?opportunity=<id|slug>` attaches a public opportunity; `?private=<ref>`
 * a Green Hill Private teaser (which switches to the §21 qualification form).
 */
export default function Enquire() {
  const { t, language } = useLanguage();
  const [params] = useSearchParams();
  const opportunityKey = params.get('opportunity');
  const privateKey = params.get('private');
  const [opportunity, setOpportunity] = useState<EnquiryOpportunity | null>(null);
  const whatsappUrl = getPublicWhatsAppUrl();
  const variant = privateKey ? 'private' : 'standard';

  useEffect(() => {
    return applyPageSeo({
      title: t('enquiry.page.seoTitle'),
      description: t('enquiry.page.seoDescription'),
      canonicalPath: `/${language}/enquire`,
      lang: language,
    });
  }, [t, language]);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (privateKey) {
        const teaser = await fetchPrivateTeaser(privateKey);
        if (active && teaser) {
          setOpportunity({
            id: String(teaser.id),
            title: String(teaser.title ?? ''),
            reference: teaser.listing_code ? String(teaser.listing_code) : undefined,
          });
        }
        return;
      }
      if (!opportunityKey) return;
      if (!isSupabaseConfigured) {
        const demo = demoProperties.find((item) => item.id === opportunityKey);
        if (active && demo) setOpportunity({ id: null, title: demo.title, reference: demo.listingCode });
        return;
      }
      const { data } = await publicOpportunityByKey(opportunityKey).maybeSingle();
      if (active && data) {
        const row = data as Record<string, unknown>;
        setOpportunity({
          id: String(row.id),
          title: String(row.title ?? ''),
          reference: row.listing_code ? String(row.listing_code) : undefined,
        });
      }
    };
    void resolve();
    return () => {
      active = false;
    };
  }, [opportunityKey, privateKey]);

  return (
    <div className="gh-priv gh-enquire min-h-screen">
      <Navbar />
      <main>
        <section className="gh-priv-section gh-priv-section--ivory gh-priv-section--enquiry gh-enquire__section" aria-labelledby="gh-enquire-title">
          <div className="gh-priv-enquiry">
            <div className="gh-priv-enquiry__intro">
              <p className="gh-priv-eyebrow gh-priv-eyebrow--dark">
                <BrandCurveMark className="gh-priv-mark" isInView />
                <span>{t(variant === 'private' ? 'enquiry.page.privateEyebrow' : 'enquiry.page.eyebrow')}</span>
              </p>
              <h1 id="gh-enquire-title" className="gh-priv-title">
                {t(variant === 'private' ? 'enquiry.page.privateTitle' : 'enquiry.page.title')}
              </h1>
              <p className="gh-priv-body gh-priv-body--narrow">
                {t(variant === 'private' ? 'enquiry.page.privateLead' : 'enquiry.page.lead')}
              </p>
              {whatsappUrl ? (
                <p className="gh-priv-body gh-priv-body--narrow gh-enquire__direct">
                  {t('enquiry.page.direct')}{' '}
                  <a
                    href={generalWhatsAppLink(language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackContact({ channel: 'whatsapp', form: 'enquire-direct' })}
                  >
                    {t('enquiry.page.directLink')}
                  </a>
                </p>
              ) : null}
            </div>
            <InvestorProfileForm variant={variant} opportunity={opportunity} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
