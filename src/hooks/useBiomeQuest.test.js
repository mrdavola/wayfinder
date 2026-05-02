// src/hooks/useBiomeQuest.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBiomeQuest } from './useBiomeQuest';

const mockSingle = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

const makeQuest = (stages = []) => ({
  id: 'q1',
  title: 'Test Quest',
  description: 'desc',
  biome_id: 'campsite',
  character_image_url: null,
  quest_stages: stages,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBiomeQuest', () => {
  it('starts in loading state', () => {
    mockSingle.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useBiomeQuest('q1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.quest).toBeNull();
    expect(result.current.stages).toEqual([]);
  });

  it('returns quest and sorted stages on success', async () => {
    const stages = [
      { id: 's2', stage_number: 2, status: 'locked', title: 'Stage 2' },
      { id: 's1', stage_number: 1, status: 'active', title: 'Stage 1' },
    ];
    mockSingle.mockResolvedValue({ data: makeQuest(stages), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quest?.id).toBe('q1');
    expect(result.current.stages[0].stage_number).toBe(1);
    expect(result.current.stages[1].stage_number).toBe(2);
  });

  it('maps stage status to biomeState', async () => {
    const stages = [
      { id: 's1', stage_number: 1, status: 'completed', title: 'S1' },
      { id: 's2', stage_number: 2, status: 'active',    title: 'S2' },
      { id: 's3', stage_number: 3, status: 'locked',    title: 'S3' },
    ];
    mockSingle.mockResolvedValue({ data: makeQuest(stages), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stages[0].biomeState).toBe('completed');
    expect(result.current.stages[1].biomeState).toBe('active');
    expect(result.current.stages[2].biomeState).toBe('future');
  });

  it('sets error on failure', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.quest).toBeNull();
  });

  it('does nothing when questId is falsy', () => {
    const { result } = renderHook(() => useBiomeQuest(null));
    expect(result.current.loading).toBe(true); // stays loading, no fetch
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('refreshStages re-fetches data', async () => {
    mockSingle.mockResolvedValue({ data: makeQuest([]), error: null });
    const { result } = renderHook(() => useBiomeQuest('q1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockSingle.mockClear();
    await result.current.refreshStages();
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });
});
