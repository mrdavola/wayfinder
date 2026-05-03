-- ============================================================
-- 058: get_quest_teammates — public RPC for BiomePage
-- ============================================================
-- Students view BiomePage without auth. This SECURITY DEFINER
-- function lets the anon key fetch fellow group members for a
-- quest so they appear as hotspots in the world.
-- Returns only name and avatar_emoji — no contact info.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_quest_teammates(p_quest_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'student_id', m.student_id,
        'role',       m.role,
        'name',       s.name,
        'avatar_emoji', s.avatar_emoji
      )
      ORDER BY s.name
    ),
    '[]'::jsonb
  )
  FROM quest_groups   qg
  JOIN quest_group_members m ON m.group_id = qg.id
  JOIN students        s ON s.id = m.student_id
  WHERE qg.quest_id = p_quest_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_quest_teammates(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_quest_teammates(uuid) TO authenticated;

COMMIT;
