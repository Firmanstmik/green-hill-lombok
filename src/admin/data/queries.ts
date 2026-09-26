import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount, ratesAreUsable } from '@/lib/opportunityPrice';
import { useRepository } from '../AdminSession';
import type { Enquiry, EnquiryStatus, NewEnquiry } from '../domain/enquiry';
import type { Opportunity } from '../domain/opportunity';
import type { DerivedValues } from '../domain/opportunityRow';
import type { DraftRow, NoteRecord } from '../domain/content';

const STALE = 30_000;

function useKeys() {
  const { mode } = useRepository();
  return {
    opportunities: ['gh-admin', mode, 'opportunities'] as const,
    opportunity: (id: string) => ['gh-admin', mode, 'opportunity', id] as const,
    enquiries: ['gh-admin', mode, 'enquiries'] as const,
    activity: (id: string) => ['gh-admin', mode, 'activity', id] as const,
  };
}

export function useOpportunities() {
  const repository = useRepository();
  const keys = useKeys();
  return useQuery({ queryKey: keys.opportunities, queryFn: () => repository.listOpportunities(), staleTime: STALE });
}

export function useOpportunity(id: string | null) {
  const repository = useRepository();
  const keys = useKeys();
  return useQuery({
    queryKey: keys.opportunity(id ?? 'new'),
    queryFn: () => (id ? repository.getOpportunity(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/** Derived EUR reference for the legacy `price` column (display/sort only). */
export function useDerivedValues() {
  const { exchangeRates } = useCurrency();
  return useCallback(
    (o: Opportunity): DerivedValues => {
      if (o.priceOnRequest || !o.priceAmount || !ratesAreUsable(exchangeRates)) return { priceEUR: null };
      return { priceEUR: convertAmount(o.priceAmount, o.priceCurrency, 'EUR', exchangeRates) };
    },
    [exchangeRates],
  );
}

export function useSaveOpportunity() {
  const repository = useRepository();
  const keys = useKeys();
  const client = useQueryClient();
  const derive = useDerivedValues();

  return useMutation({
    mutationFn: async ({ record, expectedUpdatedAt }: { record: Opportunity; expectedUpdatedAt: string | null }) =>
      record.id
        ? repository.updateOpportunity(record, derive(record), expectedUpdatedAt)
        : repository.createOpportunity(record, derive(record)),
    onSuccess: (saved) => {
      if (saved.id) client.setQueryData(keys.opportunity(saved.id), saved);
      client.setQueryData<Opportunity[]>(keys.opportunities, (list) => {
        if (!list) return list;
        const rest = list.filter((item) => item.id !== saved.id);
        return [saved, ...rest];
      });
    },
  });
}

export function useDeleteDraft() {
  const repository = useRepository();
  const keys = useKeys();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.deleteDraft(id),
    onSuccess: (_, id) => {
      client.setQueryData<Opportunity[]>(keys.opportunities, (list) => list?.filter((item) => item.id !== id));
    },
  });
}

export function useEnquiries() {
  const repository = useRepository();
  const keys = useKeys();
  return useQuery({ queryKey: keys.enquiries, queryFn: () => repository.listEnquiries(), staleTime: STALE });
}

export function useEnquiryActivity(id: string | null) {
  const repository = useRepository();
  const keys = useKeys();
  return useQuery({
    queryKey: keys.activity(id ?? 'none'),
    queryFn: () => repository.listActivity(id as string),
    enabled: Boolean(id),
  });
}

function replaceEnquiry(list: Enquiry[] | undefined, saved: Enquiry) {
  if (!list) return list;
  return list.some((item) => item.id === saved.id)
    ? list.map((item) => (item.id === saved.id ? saved : item))
    : [saved, ...list];
}

export function useUpdateEnquiryStatus() {
  const repository = useRepository();
  const keys = useKeys();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) => repository.updateEnquiryStatus(id, status),
    onSuccess: (saved) => {
      client.setQueryData<Enquiry[]>(keys.enquiries, (list) => replaceEnquiry(list, saved));
      void client.invalidateQueries({ queryKey: keys.activity(saved.id) });
    },
  });
}

export function useCreateEnquiry() {
  const repository = useRepository();
  const keys = useKeys();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEnquiry) => repository.createEnquiry(input),
    onSuccess: (saved) => {
      client.setQueryData<Enquiry[]>(keys.enquiries, (list) => replaceEnquiry(list, saved));
    },
  });
}

export function useAddNote() {
  const repository = useRepository();
  const keys = useKeys();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ enquiryId, body }: { enquiryId: string; body: string }) => repository.addNote(enquiryId, body),
    onSuccess: (_, { enquiryId }) => {
      void client.invalidateQueries({ queryKey: keys.activity(enquiryId) });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Site content & Notes                                                 */
/* ------------------------------------------------------------------ */

export function useContentRows() {
  const repository = useRepository();
  const { mode } = repository;
  return useQuery({
    queryKey: ['gh-admin', mode, 'content'],
    queryFn: () => repository.listContent(),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useContentActions() {
  const repository = useRepository();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['gh-admin', repository.mode, 'content'] });
  return {
    save: (page: string, rows: DraftRow[], expected: string | null) => repository.saveContentDraft(page, rows, expected),
    publish: async (page: string) => {
      await repository.publishContent(page);
      await refresh();
    },
    discard: async (page: string) => {
      await repository.discardContentDraft(page);
      await refresh();
    },
    upload: (file: File) => repository.uploadContentImage(file),
    refresh,
  };
}

export function useNotesList() {
  const repository = useRepository();
  return useQuery({
    queryKey: ['gh-admin', repository.mode, 'notes'],
    queryFn: () => repository.listNotes(),
    staleTime: STALE,
  });
}

export function useNoteActions() {
  const repository = useRepository();
  const client = useQueryClient();
  const key = ['gh-admin', repository.mode, 'notes'];
  return {
    save: async (note: NoteRecord, expected: string | null) => {
      const saved = await repository.saveNote(note, expected);
      client.setQueryData<NoteRecord[]>(key, (list) => (list ? [saved, ...list.filter((n) => n.id !== saved.id)] : list));
      return saved;
    },
    remove: async (id: string) => {
      await repository.deleteNote(id);
      client.setQueryData<NoteRecord[]>(key, (list) => list?.filter((n) => n.id !== id));
    },
    upload: (file: File) => repository.uploadContentImage(file),
  };
}
