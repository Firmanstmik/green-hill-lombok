export type InvoiceContactLine = {
  label: string;
  value: string;
};

export type InvoiceParty = {
  name: string;
  /** Role / relationship line, e.g. "Founder — Green Hill Lombok" */
  title?: string;
  addressLines: string[];
  contacts: InvoiceContactLine[];
};

export type InvoiceLineItem = {
  description: string;
  detail?: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type InvoicePaymentDetails = {
  accountName: string;
  bank: string;
  accountNumber: string;
  paymentReference: string;
  /** Omit entirely when unavailable — do not invent SWIFT/BIC. */
  swiftBic?: string;
};

export type InvoiceProvider = {
  name: string;
  title: string;
  email: string;
  phone: string;
  website: string;
};

export type InvoiceLabels = {
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  from: string;
  to: string;
  project: string;
  description: string;
  qty: string;
  rate: string;
  amount: string;
  projectTotal: string;
  initialDeposit: string;
  balanceAfterDeposit: string;
  amountDue: string;
  paymentDetails: string;
  accountName: string;
  bank: string;
  accountNumber: string;
  paymentReference: string;
  paymentTerms: string;
};

export type InvoiceData = {
  locale: 'en' | 'id';
  brandName: string;
  brandTagline: string;
  invoiceTitle: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: 'IDR';
  labels: InvoiceLabels;
  sender: InvoiceParty;
  client: InvoiceParty;
  projectName: string;
  items: InvoiceLineItem[];
  projectTotal: number;
  depositPercentage: number;
  depositAmount: number;
  remainingBalance: number;
  amountDue: number;
  paymentDetails: InvoicePaymentDetails;
  paymentTerms: string[];
  /** Closing message lines shown above the service-provider block */
  footerNotes: string[];
  /** Service provider identity — never the client brand */
  footerProvider: InvoiceProvider;
};
