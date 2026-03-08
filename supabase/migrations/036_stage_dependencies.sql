-- Add dependency support to quest_stages
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS dependencies UUID[] DEFAULT '{}';

-- When a stage has dependencies, ALL must be completed before it unlocks.
-- Empty dependencies = only requires stage_number - 1 (backward compat with linear quests).

-- Create a function to check if a stage can be unlocked
CREATE OR REPLACE FUNCTION check_stage_unlockable(p_stage_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  deps UUID[];
  all_done BOOLEAN;
BEGIN
  SELECT dependencies INTO deps FROM quest_stages WHERE id = p_stage_id;

  -- No dependencies = linear progression (always unlockable by caller)
  IF deps IS NULL OR array_length(deps, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- All dependency stages must be completed
  SELECT bool_and(status = 'completed')
  INTO all_done
  FROM quest_stages
  WHERE id = ANY(deps);

  RETURN COALESCE(all_done, FALSE);
END;
$$ LANGUAGE plpgsql;
