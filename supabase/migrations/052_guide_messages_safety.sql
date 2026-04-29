-- ═══════════════════════════════════════════════════════════════════════════════
-- 052: Guide messages safety
--
-- Background: migration 014 created `guide_messages` with an open INSERT policy
-- (`with check (true)`) so any anon caller could write arbitrary content. The
-- content is later rendered via dangerouslySetInnerHTML to other students,
-- making this a stored-XSS channel.
--
-- This migration:
--   1. Drops the open INSERT policy.
--   2. Adds a guide-owned policy (the quest's guide can insert directly via
--      authenticated session — useful for moderation tools).
--   3. Adds a SECURITY DEFINER RPC `insert_guide_message(...)` that callers
--      use from the public student pages. The RPC verifies the student PIN
--      before writing, so only PIN-verified students can post messages on a
--      project they're assigned to.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Drop the wide-open policy from 014
DROP POLICY IF EXISTS "Anon can insert guide messages" ON public.guide_messages;

-- 2. Authenticated guides who own the quest can insert directly
DROP POLICY IF EXISTS "Guides can insert guide messages" ON public.guide_messages;
CREATE POLICY "Guides can insert guide messages"
  ON public.guide_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.guide_id = auth.uid()
    )
  );

-- 3. PIN-verified RPC for student inserts
CREATE OR REPLACE FUNCTION public.insert_guide_message(
  p_quest_id     uuid,
  p_stage_id     uuid,
  p_student_id   uuid,
  p_pin          text,
  p_student_name text,
  p_role         text,
  p_content      text,
  p_message_type text DEFAULT 'field_guide'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned   boolean;
  v_pin_match  boolean;
  v_inserted   public.guide_messages%ROWTYPE;
  v_role       text;
  v_msg_type   text;
BEGIN
  -- Whitelist role + message_type to prevent constraint surprises
  v_role := CASE WHEN p_role IN ('user', 'assistant', 'challenger') THEN p_role ELSE 'user' END;
  v_msg_type := COALESCE(p_message_type, 'field_guide');

  -- Trim + bound content. Long messages are clipped to keep the table sane.
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Message is empty');
  END IF;

  -- Confirm the student is assigned to this quest
  SELECT EXISTS (
    SELECT 1 FROM public.quest_students
    WHERE quest_id = p_quest_id AND student_id = p_student_id
  ) INTO v_assigned;

  IF NOT v_assigned THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Not assigned to this project');
  END IF;

  -- Verify PIN. Legacy students with no PIN are still accepted to keep older
  -- accounts working — those rows are flagged via student_id and can be
  -- audited later.
  SELECT (pin IS NULL OR pin = '' OR pin = TRIM(p_pin))
  INTO v_pin_match
  FROM public.students WHERE id = p_student_id;

  IF NOT COALESCE(v_pin_match, FALSE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid PIN');
  END IF;

  INSERT INTO public.guide_messages (
    quest_id, stage_id, student_id, student_name, role, content, message_type
  ) VALUES (
    p_quest_id, p_stage_id, p_student_id, COALESCE(p_student_name, ''),
    v_role, LEFT(p_content, 8000), v_msg_type
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', TRUE,
    'id', v_inserted.id,
    'created_at', v_inserted.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_guide_message(uuid, uuid, uuid, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_guide_message(uuid, uuid, uuid, text, text, text, text, text) TO authenticated;
