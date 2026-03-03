-- ===================== ADD student_name TO reflection_entries =====================
-- The app inserts student_name when saving AI feedback — this column was missing.
ALTER TABLE public.reflection_entries
  ADD COLUMN IF NOT EXISTS student_name text;

-- ===================== PUBLIC ACCESS FOR SIMULATION_MESSAGES =====================
-- Students access /simulation/:id without auth. They need to read + write messages.

CREATE POLICY "Public can read simulation messages for active quests"
  ON public.simulation_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.career_simulations cs
      JOIN public.quests q ON q.id = cs.quest_id
      WHERE cs.id = simulation_id AND q.status = 'active'
    )
  );

CREATE POLICY "Public can write simulation messages for active quests"
  ON public.simulation_messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.career_simulations cs
      JOIN public.quests q ON q.id = cs.quest_id
      WHERE cs.id = simulation_id AND q.status = 'active'
    )
  );

-- Allow public to mark simulation complete and save debrief summary
CREATE POLICY "Public can complete simulations for active quests"
  ON public.career_simulations FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.status = 'active'
    )
  );
