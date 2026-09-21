import { Document, Page } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { registerInvoiceFonts } from '../fonts';
import { invoiceStyles } from './invoiceStyles';
import { InvoiceHeader } from './InvoiceHeader';
import { InvoiceParties } from './InvoiceParties';
import { InvoiceItems } from './InvoiceItems';
import { InvoiceTotals } from './InvoiceTotals';
import { PaymentDetails } from './PaymentDetails';
import { PaymentTerms } from './PaymentTerms';
import { InvoiceFooter } from './InvoiceFooter';

type Props = {
  data: InvoiceData;
};

export function InvoiceDocument({ data }: Props) {
  registerInvoiceFonts();

  return (
    <Document
      title={`${data.brandName} — Invoice ${data.invoiceNumber}`}
      author={data.brandName}
      subject={data.projectName}
      creator={data.brandName}
    >
      <Page size="A4" style={invoiceStyles.page} wrap={false}>
        <InvoiceHeader data={data} />
        <InvoiceParties data={data} />
        <InvoiceItems data={data} />
        <InvoiceTotals data={data} />
        <PaymentDetails data={data} />
        <PaymentTerms data={data} />
        <InvoiceFooter data={data} />
      </Page>
    </Document>
  );
}

export default InvoiceDocument;
