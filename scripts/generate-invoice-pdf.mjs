/**
 * Generate EN + ID Green Hill website-development deposit invoice PDFs.
 *
 * Usage: npm run invoice:pdf
 */
import React from 'react';
import { pdf, Font } from '@react-pdf/renderer';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const fontsDir = join(root, 'src/invoice/fonts');
const logoPath = join(root, 'src/invoice/logo-green-hill-lombok-transparent.png');

const outputs = {
  en: join(root, 'src/invoice/GHL-INV-001-Green-Hill-Lombok-Website-Deposit.pdf'),
  id: join(root, 'src/invoice/GHL-INV-001-Green-Hill-Lombok-Website-Deposit-ID.pdf'),
};

const asDataUri = (filePath, mime) =>
  `data:${mime};base64,${readFileSync(filePath).toString('base64')}`;

process.env.GH_INVOICE_LOGO_DATA_URI = asDataUri(logoPath, 'image/png');

Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: asDataUri(join(fontsDir, 'CormorantGaramond-Regular.ttf'), 'font/ttf'), fontWeight: 400 },
    { src: asDataUri(join(fontsDir, 'CormorantGaramond-Medium.ttf'), 'font/ttf'), fontWeight: 500 },
    { src: asDataUri(join(fontsDir, 'CormorantGaramond-SemiBold.ttf'), 'font/ttf'), fontWeight: 600 },
  ],
});

Font.register({
  family: 'Manrope',
  fonts: [
    { src: asDataUri(join(fontsDir, 'Manrope-Regular.ttf'), 'font/ttf'), fontWeight: 400 },
    { src: asDataUri(join(fontsDir, 'Manrope-Medium.ttf'), 'font/ttf'), fontWeight: 500 },
    { src: asDataUri(join(fontsDir, 'Manrope-SemiBold.ttf'), 'font/ttf'), fontWeight: 600 },
    { src: asDataUri(join(fontsDir, 'Manrope-Bold.ttf'), 'font/ttf'), fontWeight: 700 },
  ],
});

const { markInvoiceFontsRegistered } = await import(
  pathToFileURL(join(root, 'src/invoice/fonts.ts')).href
);
markInvoiceFontsRegistered();

const { InvoiceDocument } = await import(
  pathToFileURL(join(root, 'src/invoice/components/InvoiceDocument.tsx')).href
);
const { websiteDevelopmentInvoice } = await import(
  pathToFileURL(join(root, 'src/invoice/invoiceData.ts')).href
);
const { websiteDevelopmentInvoiceId } = await import(
  pathToFileURL(join(root, 'src/invoice/invoiceData.id.ts')).href
);

async function writeInvoicePdf(data, outPath) {
  const stream = await pdf(React.createElement(InvoiceDocument, { data })).toBuffer();
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  writeFileSync(outPath, buffer);
  return buffer.length;
}

const enBytes = await writeInvoicePdf(websiteDevelopmentInvoice, outputs.en);
const idBytes = await writeInvoicePdf(websiteDevelopmentInvoiceId, outputs.id);

console.log('Wrote EN', outputs.en, 'bytes=', enBytes);
console.log('Wrote ID', outputs.id, 'bytes=', idBytes);
console.log({
  invoiceNumber: websiteDevelopmentInvoice.invoiceNumber,
  amountDue: websiteDevelopmentInvoice.amountDue,
  footerProvider: websiteDevelopmentInvoice.footerProvider.name,
  noGreenHillInFooter: !websiteDevelopmentInvoice.footerNotes.join(' ').includes('Thank you for choosing'),
  hasPlaceholder:
    JSON.stringify(websiteDevelopmentInvoice).includes('PLACEHOLDER') ||
    JSON.stringify(websiteDevelopmentInvoiceId).includes('PLACEHOLDER'),
});
