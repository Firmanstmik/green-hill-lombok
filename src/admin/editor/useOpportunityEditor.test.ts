import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Opportunity } from '../domain/opportunity';

type Call = { id: string | null; expectedUpdatedAt: string | null };
const calls: Call[] = [];
let version = 0;

// A fake server: inserts get an id, every save gets a new updated_at, and a
// stale updated_at is refused (as the real repository does).
vi.mock('../data/queries', () => ({
  useSaveOpportunity: () => ({
    mutateAsync: async ({ record, expectedUpdatedAt }: { record: Opportunity; expectedUpdatedAt: string | null }) => {
      calls.push({ id: record.id, expectedUpdatedAt });
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (record.id && expectedUpdatedAt !== `v${version}`) throw new Error('conflict');
      version += 1;
      return { ...record, id: record.id ?? 'opp-1', updatedAt: `v${version}` };
    },
  }),
}));

const { useOpportunityEditor } = await import('./useOpportunityEditor');

describe('opportunity editor saving', () => {
  beforeEach(() => {
    calls.length = 0;
    version = 0;
    localStorage.clear();
  });

  it('never inserts twice when saves overlap on a new record', async () => {
    const { result } = renderHook(() => useOpportunityEditor(null, 'GH-LOM-001'));
    act(() => result.current.update({ title: 'Selong Belanak ridge' }));

    let first: Opportunity | null = null;
    let second: Opportunity | null = null;
    await act(async () => {
      [first, second] = await Promise.all([result.current.persist(), result.current.persist()]);
    });

    expect(calls).toEqual([
      { id: null, expectedUpdatedAt: null },
      { id: 'opp-1', expectedUpdatedAt: 'v1' },
    ]);
    expect(first?.id).toBe('opp-1');
    expect(second?.id).toBe('opp-1');
    expect(result.current.state.kind).toBe('saved');
  });

  it('saving twice updates the same record without a false conflict', async () => {
    const { result } = renderHook(() => useOpportunityEditor(null, 'GH-LOM-001'));
    act(() => result.current.update({ title: 'Kuta hillside' }));
    await act(async () => {
      await result.current.persist();
    });
    act(() => result.current.update({ summary: 'A quiet hillside plot above Kuta bay.' }));
    await act(async () => {
      await result.current.persist();
    });

    expect(calls.map((call) => call.id)).toEqual([null, 'opp-1']);
    expect(result.current.state.kind).toBe('saved');
    expect(result.current.dirty).toBe(false);
  });
});
