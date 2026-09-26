import { isSupabaseConfigured, supabase } from './supabase';
import { loadLocalStore } from '@/admin/data/localLoader';

export type EnquirySource = 'private' | 'opportunity' | 'general';

export type EnquirySubmission = {
  name: string;
  email?: string;
  whatsapp?: string;
  country?: string;
  enquiryType?: string;
  message?: string;
  source: EnquirySource;
  opportunityId?: string | null;
  /** Investor qualification (brief §9, §21). */
  company?: string;
  budget?: string;
  investorType?: string;
  interests?: string[];
  objective?: string;
  timeframe?: string;
};

/**
 * Records a public enquiry so it appears in the admin.
 * Never blocks the visitor: the WhatsApp hand-off happens regardless of the result.
 * Visitors can only insert; they can never read enquiries back.
 */
export async function recordEnquiry(input: EnquirySubmission): Promise<boolean> {
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('submit_enquiry', {
        p_name: input.name,
        p_email: input.email || null,
        p_whatsapp: input.whatsapp || null,
        p_country: input.country || null,
        p_enquiry_type: input.enquiryType || null,
        p_message: input.message || null,
        p_source: input.source,
        p_opportunity_id: input.opportunityId || null,
        p_company: input.company || null,
        p_budget: input.budget || null,
        p_investor_type: input.investorType || null,
        p_interests: input.interests && input.interests.length > 0 ? input.interests : null,
        p_objective: input.objective || null,
        p_timeframe: input.timeframe || null,
      });
      return !error;
    }
    if (loadLocalStore) {
      // Development without a database: keep the enquiry in this browser's
      // local admin preview store so the admin workflow can be exercised.
      const { localRecordPublicEnquiry } = await loadLocalStore();
      localRecordPublicEnquiry(input);
      return true;
    }
  } catch {
    // Swallowed on purpose: recording must never interrupt the visitor.
  }
  return false;
}
