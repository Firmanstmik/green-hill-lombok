import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { websiteDevelopmentInvoice } from '@/invoice/invoiceData';
import { websiteDevelopmentInvoiceId } from '@/invoice/invoiceData.id';
import { InvoiceDocument } from '@/invoice/components/InvoiceDocument';
import { formatIdr } from '@/invoice/formatCurrency';
import type { InvoiceData } from '@/invoice/types';

const invoices: Record<'en' | 'id', { data: InvoiceData; fileName: string; title: string }> = {
  en: {
    data: websiteDevelopmentInvoice,
    fileName: 'GHL-INV-001-Green-Hill-Lombok-Website-Deposit.pdf',
    title: 'Website Development Invoice',
  },
  id: {
    data: websiteDevelopmentInvoiceId,
    fileName: 'GHL-INV-001-Green-Hill-Lombok-Website-Deposit-ID.pdf',
    title: 'Invoice Pengembangan Website',
  },
};

/**
 * Isolated invoice preview + PDF export (EN / ID).
 * Data: `invoiceData.ts` and `invoiceData.id.ts`
 */
export default function InvoicePage() {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const active = invoices[locale];
  const data = active.data;

  const document = useMemo(() => <InvoiceDocument data={data} />, [data]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F1EDE5', color: '#17382E' }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-5 border-b border-[#D9D2C5] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: '#C79D5A', fontFamily: 'Manrope, sans-serif' }}
            >
              {data.invoiceNumber} · {locale.toUpperCase()}
            </p>
            <h1
              className="text-3xl sm:text-4xl"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
            >
              {active.title}
            </h1>
            <p
              className="mt-2 max-w-xl text-sm leading-relaxed"
              style={{ color: '#5C6B63', fontFamily: 'Manrope, sans-serif' }}
            >
              {locale === 'en' ? (
                <>
                  Initial 50% deposit for {data.projectName}. Amount due:{' '}
                  <strong style={{ color: '#17382E' }}>{formatIdr(data.amountDue)}</strong>.
                </>
              ) : (
                <>
                  Deposit awal 50% untuk {data.projectName}. Jumlah tagihan:{' '}
                  <strong style={{ color: '#17382E' }}>{formatIdr(data.amountDue)}</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex border border-[#17382E]/20"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <button
                type="button"
                onClick={() => setLocale('en')}
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
                style={{
                  backgroundColor: locale === 'en' ? '#17382E' : 'transparent',
                  color: locale === 'en' ? '#FFFFFF' : '#17382E',
                }}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale('id')}
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
                style={{
                  backgroundColor: locale === 'id' ? '#17382E' : 'transparent',
                  color: locale === 'id' ? '#FFFFFF' : '#17382E',
                }}
              >
                ID
              </button>
            </div>

            <PDFDownloadLink
              key={locale}
              document={document}
              fileName={active.fileName}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#17382E', fontFamily: 'Manrope, sans-serif' }}
            >
              {({ loading }) => (
                <>
                  <Download size={14} strokeWidth={1.5} />
                  {loading ? 'Preparing…' : locale === 'en' ? 'Download PDF' : 'Unduh PDF'}
                </>
              )}
            </PDFDownloadLink>
          </div>
        </header>

        <div
          className="overflow-hidden border border-[#D9D2C5] bg-[#E8E2D8]"
          style={{ height: 'min(1120px, calc(100vh - 180px))' }}
        >
          <PDFViewer key={locale} width="100%" height="100%" showToolbar>
            <InvoiceDocument data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
