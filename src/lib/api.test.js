import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before importing api.js
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { loadCabinData } from './api';
import { supabase } from './supabase';

function makeChain(resolveWith) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(resolveWith).then(resolve),
  };
  return chain;
}

const STUDENT_ID = 'stu-123';

const MOCK_QUESTS = [
  { id: 'q1', title: 'Wetlands Study', status: 'active',     biome_id: 'campsite', completed_at: null },
  { id: 'q2', title: 'Cell Biology',   status: 'completed',  biome_id: 'lab',      completed_at: '2026-04-01T00:00:00Z' },
  { id: 'q3', title: 'No Biome',       status: 'active',     biome_id: null,       completed_at: null },
];

const MOCK_SKILLS = [
  { id: 'sk1', name: 'Observation', category: 'science', mastery_level: 3 },
  { id: 'sk2', name: 'Teamwork',    category: 'social',  mastery_level: 1 },
];

const MOCK_MESSAGES = [
  { id: 'msg1', content: 'Good work!', created_at: '2026-05-01T10:00:00Z', read_at: null, source: 'guide' },
];

describe('loadCabinData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projects split into active and completed', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [{ quest_id: 'q1' }, { quest_id: 'q2' }, { quest_id: 'q3' }], error: null });
      if (table === 'quests')              return makeChain({ data: MOCK_QUESTS, error: null });
      if (table === 'student_skills')      return makeChain({ data: MOCK_SKILLS, error: null });
      if (table === 'guide_messages')      return makeChain({ data: MOCK_MESSAGES, error: null });
      if (table === 'submission_feedback') return makeChain({ data: [], error: null });
      if (table === 'parent_access')       return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);

    expect(result.projects.filter(p => p.status === 'active').length).toBe(2);
    expect(result.completedProjects.length).toBe(1);
    expect(result.completedProjects[0].id).toBe('q2');
  });

  it('returns skills array', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [], error: null });
      if (table === 'quests')              return makeChain({ data: [], error: null });
      if (table === 'student_skills')      return makeChain({ data: MOCK_SKILLS, error: null });
      if (table === 'guide_messages')      return makeChain({ data: [], error: null });
      if (table === 'submission_feedback') return makeChain({ data: [], error: null });
      if (table === 'parent_access')       return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0].name).toBe('Observation');
  });

  it('merges messages from all three sources', async () => {
    const feedbackMsg = { id: 'fb1', warm_feedback: 'Nice!', created_at: '2026-04-28T00:00:00Z', source: 'feedback' };
    const parentMsg   = { id: 'pa1', notes: 'Proud of you', updated_at: '2026-04-27T00:00:00Z', source: 'parent' };

    supabase.from.mockImplementation((table) => {
      if (table === 'quest_group_members') return makeChain({ data: [], error: null });
      if (table === 'quests')              return makeChain({ data: [], error: null });
      if (table === 'student_skills')      return makeChain({ data: [], error: null });
      if (table === 'guide_messages')      return makeChain({ data: MOCK_MESSAGES, error: null });
      if (table === 'submission_feedback') return makeChain({ data: [feedbackMsg], error: null });
      if (table === 'parent_access')       return makeChain({ data: [parentMsg], error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await loadCabinData(STUDENT_ID);
    expect(result.messages).toHaveLength(3);
    // sorted newest-first
    expect(result.messages[0].id).toBe('msg1');
  });

  it('returns empty arrays gracefully when all tables are empty', async () => {
    supabase.from.mockImplementation(() => makeChain({ data: [], error: null }));
    const result = await loadCabinData(STUDENT_ID);
    expect(result.projects).toEqual([]);
    expect(result.completedProjects).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.messages).toEqual([]);
  });
});
