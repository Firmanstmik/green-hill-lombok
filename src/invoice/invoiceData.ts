import type { InvoiceData } from './types';

/**
 * English deposit invoice — personal freelance project.
 * Firman Maulana → Reece, Founder of Green Hill Lombok.
 */
const PROJECT_TOTAL = 25_000_000;
const DEPOSIT_PERCENTAGE = 50;
const DEPOSIT_AMOUNT = PROJECT_TOTAL * (DEPOSIT_PERCENTAGE / 100);
const REMAINING_BALANCE = PROJECT_TOTAL - DEPOSIT_AMOUNT;

export const websiteDevelopmentInvoice: InvoiceData = {
  locale: 'en',
  brandName: 'GREEN HILL LOMBOK',
  brandTagline: 'Curated Land & Investments',
  invoiceTitle: 'INVOICE',
  invoiceNumber: 'GHL-INV-001',
  issueDate: '8 September 2026',
  dueDate: '9 September 2026',
  currency: 'IDR',

  labels: {
    invoiceNo: 'Invoice No',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    from: 'From',
    to: 'To',
    project: 'Project',
    description: 'Description',
    qty: 'Qty',
    rate: 'Rate',
    amount: 'Amount',
    projectTotal: 'Project Total',
    initialDeposit: 'Initial Deposit',
    balanceAfterDeposit: 'Balance After Deposit',
    amountDue: 'Amount Due',
    paymentDetails: 'Payment Details',
    accountName: 'Account Name',
    bank: 'Bank',
    accountNumber: 'Account Number',
    paymentReference: 'Payment Reference',
    paymentTerms: 'Payment Terms',
  },

  sender: {
    name: 'Firman Maulana',
    addressLines: ['Indonesia'],
    contacts: [
      { label: 'Email', value: 'firmanmaulanastmik@gmail.com' },
      { label: 'WhatsApp', value: '+62 812-3689-3055' },
      { label: 'Portfolio', value: 'https://www.firmanlabs.my.id/' },
    ],
  },

  client: {
    name: 'Reece',
    title: 'Founder — Green Hill Lombok',
    addressLines: ['Jalan Mawun, Kuta Mandalika, Lombok, Indonesia'],
    contacts: [{ label: 'Email', value: 'reeceygreen88@gmail.com' }],
  },

  projectName: 'Green Hill Lombok Website Development',

  items: [
    {
      description: 'Website Design & Development',
      detail: 'Green Hill Lombok website — first development phase',
      quantity: 1,
      rate: PROJECT_TOTAL,
      amount: PROJECT_TOTAL,
    },
  ],

  projectTotal: PROJECT_TOTAL,
  depositPercentage: DEPOSIT_PERCENTAGE,
  depositAmount: DEPOSIT_AMOUNT,
  remainingBalance: REMAINING_BALANCE,
  amountDue: DEPOSIT_AMOUNT,

  paymentDetails: {
    accountName: 'FIRMAN MAULANA',
    bank: 'Bank BRI',
    accountNumber: '019101091881503',
    paymentReference: 'Green Hill Lombok Website',
  },

  paymentTerms: [
    '50% initial deposit is required to commence the website development project.',
    'The remaining 50% development balance is payable upon completion of the agreed first version / before final launch, subject to the agreed project scope.',
    'Hosting, domain and infrastructure costs are separate from the development fee and will be discussed/confirmed separately before the website goes live.',
  ],

  footerNotes: [
    'Thank you, Reece.',
    'Looking forward to working together on Green Hill Lombok.',
  ],

  footerProvider: {
    name: 'FIRMAN MAULANA',
    title: 'Web Design & Full-Stack Development',
    email: 'firmanmaulanastmik@gmail.com',
    phone: '+62 812-3689-3055',
    website: 'https://www.firmanlabs.my.id/',
  },
};

export default websiteDevelopmentInvoice;
