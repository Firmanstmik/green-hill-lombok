import type { InvoiceData } from './types';

/**
 * Indonesian deposit invoice — personal freelance project.
 * Firman Maulana → Reece, Founder of Green Hill Lombok.
 * Separate file from the English invoice data.
 */
const PROJECT_TOTAL = 25_000_000;
const DEPOSIT_PERCENTAGE = 50;
const DEPOSIT_AMOUNT = PROJECT_TOTAL * (DEPOSIT_PERCENTAGE / 100);
const REMAINING_BALANCE = PROJECT_TOTAL - DEPOSIT_AMOUNT;

export const websiteDevelopmentInvoiceId: InvoiceData = {
  locale: 'id',
  brandName: 'GREEN HILL LOMBOK',
  brandTagline: 'Curated Land & Investments',
  invoiceTitle: 'INVOICE',
  invoiceNumber: 'GHL-INV-001',
  issueDate: '8 September 2026',
  dueDate: '9 September 2026',
  currency: 'IDR',

  labels: {
    invoiceNo: 'No. Invoice',
    issueDate: 'Tanggal Terbit',
    dueDate: 'Jatuh Tempo',
    from: 'Dari',
    to: 'Kepada',
    project: 'Proyek',
    description: 'Deskripsi',
    qty: 'Jml',
    rate: 'Tarif',
    amount: 'Jumlah',
    projectTotal: 'Total Proyek',
    initialDeposit: 'Deposit Awal',
    balanceAfterDeposit: 'Sisa Setelah Deposit',
    amountDue: 'Jumlah Tagihan',
    paymentDetails: 'Detail Pembayaran',
    accountName: 'Nama Rekening',
    bank: 'Bank',
    accountNumber: 'Nomor Rekening',
    paymentReference: 'Referensi Pembayaran',
    paymentTerms: 'Ketentuan Pembayaran',
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

  projectName: 'Pengembangan Website Green Hill Lombok',

  items: [
    {
      description: 'Desain & Pengembangan Website',
      detail: 'Website Green Hill Lombok — fase pengembangan pertama',
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
    'Deposit awal sebesar 50% diperlukan untuk memulai proyek pengembangan website.',
    'Sisa biaya pengembangan sebesar 50% dibayarkan setelah versi pertama yang disepakati selesai / sebelum peluncuran akhir, sesuai ruang lingkup proyek yang telah disetujui.',
    'Biaya hosting, domain, dan infrastruktur terpisah dari biaya pengembangan dan akan dibahas/dikonfirmasi secara terpisah sebelum website ditayangkan.',
  ],

  footerNotes: [
    'Terima kasih, Reece.',
    'Saya menantikan kerja sama kita untuk Green Hill Lombok.',
  ],

  footerProvider: {
    name: 'FIRMAN MAULANA',
    title: 'Web Design & Full-Stack Development',
    email: 'firmanmaulanastmik@gmail.com',
    phone: '+62 812-3689-3055',
    website: 'https://www.firmanlabs.my.id/',
  },
};

export default websiteDevelopmentInvoiceId;
