// src/hooks/useBiomeQuest.js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * @typedef {'future'|'active'|'completed'} BiomeState
 *
 * @typedef {Object} BiomeStage
 * @property {string} id
 * @property {number} stage_number
 * @property {string} status           — 'locked'|'active'|'completed' from DB
 * @property {BiomeState} biomeState   — derived display state
 * @property {string} title
 * @property {string} [description]
 * @property {string} [challenge]
 * @property {string} [deliverable_description]
 * @property {string} [guiding_questions]
 */

function toState(status) {
  if (status === 'completed') return 'completed';
  if (status === 'active')    return 'active';
  return 'future';
}

/**
 * @param {string|null} questId
 * @returns {{
 *   quest: object|null,
 *   stages: BiomeStage[],
 *   loading: boolean,
 *   error: Error|null,
 *   refreshStages: () => Promise<void>,
 * }}
 */
export function useBiomeQuest(questId) {
  const [quest,   setQuest]   = useState(null);
  const [stages,  setStages]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!questId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('quests')
      .select('*, quest_stages(*)')
      .eq('id', questId)
      .single();

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    const sorted = [...(data.quest_stages || [])].sort(
      (a, b) => a.stage_number - b.stage_number
    );
    const mapped = sorted.map(s => ({ ...s, biomeState: toState(s.status) }));

    setError(null);
    setQuest(data);
    setStages(mapped);
    setLoading(false);
  }, [questId]);

  useEffect(() => { load(); }, [load]);

  return { quest, stages, loading, error, refreshStages: load };
}
