export const ENQUIRY_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'viewing',
  'negotiating',
  'completed',
  'closed',
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing: 'Viewing',
  negotiating: 'Negotiating',
  completed: 'Completed',
  closed: 'Closed',
};

/** Short, calm guidance shown next to the status control. */
export const ENQUIRY_STATUS_HINT: Record<EnquiryStatus, string> = {
  new: 'Not yet answered.',
  contacted: 'You have replied or reached out.',
  qualified: 'A genuine fit worth pursuing.',
  viewing: 'A site visit or call is arranged.',
  negotiating: 'Terms are being discussed.',
  completed: 'The conversation reached its outcome.',
  closed: 'No further action needed.',
};

export type EnquirySource = 'private' | 'opportunity' | 'general' | 'manual';

export const ENQUIRY_SOURCE_LABEL: Record<EnquirySource, string> = {
  private: 'Green Hill Private',
  opportunity: 'Opportunity page',
  general: 'Website',
  manual: 'Recorded by you',
};

export interface Enquiry {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  enquiryType: string;
  message: string;
  source: EnquirySource;
  opportunityId: string | null;
  opportunityTitle: string;
  status: EnquiryStatus;
  /** Investor qualification (brief §9, §21). Empty when not asked. */
  company: string;
  budget: string;
  investorType: string;
  interests: string[];
  objective: string;
  timeframe: string;
}

type Qualification = 'company' | 'budget' | 'investorType' | 'interests' | 'objective' | 'timeframe';

export type NewEnquiry = Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt' | 'status' | Qualification> &
  Partial<Pick<Enquiry, Qualification>> & {
    status?: EnquiryStatus;
  };

export interface EnquiryActivity {
  id: string;
  enquiryId: string;
  kind: 'created' | 'status' | 'note';
  body: string;
  fromStatus: EnquiryStatus | null;
  toStatus: EnquiryStatus | null;
  createdAt: string;
}

/** Enquiries still waiting for a first response. */
export function needsResponse(enquiry: Enquiry): boolean {
  return enquiry.status === 'new';
}

export function isOpen(enquiry: Enquiry): boolean {
  return enquiry.status !== 'completed' && enquiry.status !== 'closed';
}

export function whatsappLink(number: string): string | null {
  const digits = number.replace(/[^\d]/g, '');
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStatus(value: unknown): EnquiryStatus {
  return ENQUIRY_STATUSES.includes(value as EnquiryStatus) ? (value as EnquiryStatus) : 'new';
}

function asSource(value: unknown): EnquirySource {
  return value === 'private' || value === 'opportunity' || value === 'manual' ? value : 'general';
}

export function enquiryFromRow(row: Record<string, unknown>): Enquiry {
  return {
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || text(row.created_at),
    name: text(row.name),
    email: text(row.email),
    whatsapp: text(row.whatsapp),
    country: text(row.country),
    enquiryType: text(row.enquiry_type),
    message: text(row.message),
    source: asSource(row.source),
    opportunityId: text(row.opportunity_id) || null,
    opportunityTitle: text(row.opportunity_title),
    status: asStatus(row.status),
    company: text(row.company),
    budget: text(row.budget),
    investorType: text(row.investor_type),
    interests: Array.isArray(row.interests) ? (row.interests as unknown[]).map(text).filter(Boolean) : [],
    objective: text(row.objective),
    timeframe: text(row.timeframe),
  };
}

export function activityFromRow(row: Record<string, unknown>): EnquiryActivity {
  const kind = row.kind === 'status' || row.kind === 'note' ? row.kind : 'created';
  return {
    id: text(row.id),
    enquiryId: text(row.enquiry_id),
    kind,
    body: text(row.body),
    fromStatus: row.from_status ? asStatus(row.from_status) : null,
    toStatus: row.to_status ? asStatus(row.to_status) : null,
    createdAt: text(row.created_at),
  };
}
