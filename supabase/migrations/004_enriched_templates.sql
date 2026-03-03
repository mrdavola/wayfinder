-- Migration 004: Deduplicate and re-seed quest templates with PBL elements
-- Run in Supabase SQL Editor

-- Step 1: Add columns that are missing from the original schema
ALTER TABLE public.quest_templates
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS subtitle     TEXT,
  ADD COLUMN IF NOT EXISTS stages       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pbl_elements TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS narrative_hook TEXT;

-- Step 2: Delete all public seed templates (guide_id IS NULL = system seeds)
DELETE FROM public.quest_templates
WHERE is_public = true AND guide_id IS NULL;

-- Step 3: Insert 8 enriched templates
INSERT INTO public.quest_templates
  (title, subtitle, description, career_pathway, interest_tags, grade_band,
   total_duration_days, academic_standards, pbl_elements, usage_count, rating,
   is_public, narrative_hook, stages)
VALUES

-- Template 1: Minecraft to Material Science
(
  'Minecraft to Material Science',
  'Which material would make the best battery for an electric scooter startup?',
  'Students enter a real material science lab context, choosing battery materials for an EV startup using AI-powered testing tools.',
  'material_science',
  ARRAY['Minecraft', 'Building', 'Gaming'],
  '3-5',
  10,
  ARRAY['4.NF.B.3', 'W.4.1', 'NGSS.4-PS3-2', 'MP4'],
  ARRAY['dq', 'auth', 'cr', 'pp'],
  47, 4.8, true,
  'You''ve been hired as a junior material scientist at a fast-growing electric scooter startup. They need a better battery — lighter, stronger, and cheaper to build. Your Minecraft instincts for choosing the right materials are exactly what this team needs.',
  '[
    {"stage_number": 1, "title": "The Battery Problem", "type": "research", "duration_days": 2, "description": "Research what makes a battery work well and build your material research file."},
    {"stage_number": 2, "title": "The Material Lab", "type": "experiment", "duration_days": 3, "description": "Test 5 candidate materials against your criteria using a weighted scoring system."},
    {"stage_number": 3, "title": "Simulation Chamber", "type": "simulate", "duration_days": 1, "description": "Present your recommendation to Dr. Reyes and defend it under pressure."},
    {"stage_number": 4, "title": "The Final Report", "type": "present", "duration_days": 2, "description": "Write a 1-page brief the CEO can take to investors."},
    {"stage_number": 5, "title": "Field Notes", "type": "reflect", "duration_days": 2, "description": "Synthesize what you discovered and share it with the Quest Library."}
  ]'::jsonb
),

-- Template 2: Animal Lovers to Biotech Pioneers
(
  'Animal Lovers to Biotech Pioneers',
  'How is AI helping scientists design medicines that save animal and human lives?',
  'Learners join a biotech lab using AI to discover medicines for a rare disease affecting both elephants and humans.',
  'biology',
  ARRAY['Animals', 'Science', 'Nature'],
  '3-5',
  12,
  ARRAY['5.NF.B.5', 'W.5.2', 'NGSS.MS-LS1-1', 'MP1'],
  ARRAY['dq', 'si', 'auth', 'ref', 'pp'],
  31, 4.6, true,
  'You and your team have been recruited as junior researchers at BioFrontier, a biotech lab that uses AI to discover new medicines — targeting a rare disease that affects both elephants and humans.',
  '[
    {"stage_number": 1, "title": "How Living Systems Work", "type": "research", "duration_days": 2, "description": "Divide research with your team and build a shared Disease Profile document."},
    {"stage_number": 2, "title": "The Molecule Hunt", "type": "experiment", "duration_days": 3, "description": "Analyze effectiveness data for 6 candidate molecules and rank your top two."},
    {"stage_number": 3, "title": "Lab Defense", "type": "simulate", "duration_days": 2, "description": "Present findings to the chief scientist and defend your methodology."},
    {"stage_number": 4, "title": "Research Report", "type": "present", "duration_days": 3, "description": "Write a collaborative research report suitable for peer review."},
    {"stage_number": 5, "title": "Reflection Journal", "type": "reflect", "duration_days": 2, "description": "Record what you learned about AI in medicine and future career paths."}
  ]'::jsonb
),

-- Template 3: Cooking Chemistry
(
  'Cooking Chemistry: The Kitchen Lab',
  'What happens when you cook food? Chemistry explains everything from bread rising to chocolate melting.',
  'Learners become culinary scientists, investigating the chemistry behind everyday cooking with an AI sous-chef.',
  'biology',
  ARRAY['Cooking', 'Science', 'Art'],
  'K-2',
  8,
  ARRAY['4.MD.A.2', 'MP4', 'NGSS.MS-PS1-2'],
  ARRAY['sv', 'auth', 'ref'],
  22, 4.9, true,
  'You''ve just been hired as a culinary scientist at a food innovation lab. Every recipe is a chemical reaction — and the AI sous-chef wants your help figuring out why cakes rise, sauces emulsify, and caramel goes wrong.',
  '[
    {"stage_number": 1, "title": "The Kitchen Lab", "type": "research", "duration_days": 2, "description": "Investigate chemical reactions hidden inside everyday cooking processes."},
    {"stage_number": 2, "title": "Ingredient Experiments", "type": "experiment", "duration_days": 3, "description": "Test how changing one ingredient changes the chemical outcome of a recipe."},
    {"stage_number": 3, "title": "The Taste Test", "type": "simulate", "duration_days": 1, "description": "Present your food invention to a panel of food scientists."},
    {"stage_number": 4, "title": "Recipe Report", "type": "present", "duration_days": 2, "description": "Document your invention with a detailed ingredient analysis."}
  ]'::jsonb
),

-- Template 4: Space Architects
(
  'Space Architects: Designing a Mars Habitat',
  'Can you design a habitat that keeps humans alive on Mars? Every material choice could mean life or death.',
  'Learners prototype a Mars habitat module for NASA, choosing materials to withstand radiation, temperature extremes, and atmospheric pressure.',
  'engineering',
  ARRAY['Space', 'Building', 'Science'],
  '6-8',
  14,
  ARRAY['6.RP.A.1', 'MP1', 'NGSS.MS-ETS1-1'],
  ARRAY['dq', 'auth', 'pp', 'cr'],
  18, 4.7, true,
  'NASA has selected your team to prototype a Mars habitat module. You have a materials budget, a weight limit, and a list of Martian conditions that will challenge every decision you make.',
  '[
    {"stage_number": 1, "title": "Mars Conditions Briefing", "type": "research", "duration_days": 2, "description": "Research radiation levels, temperature extremes, and atmospheric pressure on Mars."},
    {"stage_number": 2, "title": "Material Selection", "type": "experiment", "duration_days": 4, "description": "Evaluate candidate materials for structural integrity, insulation, and radiation shielding."},
    {"stage_number": 3, "title": "Habitat Design", "type": "simulate", "duration_days": 3, "description": "Present your habitat blueprint to a NASA review board and answer hard questions."},
    {"stage_number": 4, "title": "Mission Report", "type": "present", "duration_days": 3, "description": "Write a technical report with diagrams explaining your design decisions."},
    {"stage_number": 5, "title": "Astronaut Debrief", "type": "reflect", "duration_days": 2, "description": "Reflect on what living on Mars would really mean for humankind."}
  ]'::jsonb
),

-- Template 5: Music Math
(
  'Music Math: The Sound of Fractions',
  'What do fractions have to do with music? More than you think — rhythm is math in disguise.',
  'Learners join a music production studio and discover how time signatures, beat patterns, and rhythm are fraction problems in disguise.',
  'math',
  ARRAY['Music', 'Art', 'Math'],
  '3-5',
  7,
  ARRAY['3.NF.A.1', 'SL.3.4', 'MP4'],
  ARRAY['sv', 'pp', 'cr'],
  39, 4.5, true,
  'You''ve just joined a music production studio where every beat grid is a fraction problem. The AI composer needs your help turning mathematical patterns into actual songs.',
  '[
    {"stage_number": 1, "title": "The Beat Grid", "type": "research", "duration_days": 2, "description": "Learn how time signatures map to fractions and whole numbers."},
    {"stage_number": 2, "title": "Composition Challenge", "type": "experiment", "duration_days": 3, "description": "Compose a 16-bar piece using fraction-based rhythm patterns."},
    {"stage_number": 3, "title": "Performance Pitch", "type": "present", "duration_days": 2, "description": "Perform or present your composition and explain the math behind it."}
  ]'::jsonb
),

-- Template 6: Sports Analytics
(
  'Sports Analytics: The Numbers Behind the Game',
  'What can data tell us about athletic performance, injury risk, and team strategy?',
  'Learners become junior analytics consultants for a professional sports team, uncovering patterns in game data and presenting to coaching staff.',
  'healthcare',
  ARRAY['Sports', 'Gaming', 'Math'],
  '6-8',
  9,
  ARRAY['6.SP.B.4', 'W.6.1', 'MP1'],
  ARRAY['dq', 'si', 'pp'],
  26, 4.4, true,
  'You''ve been hired as a junior analytics consultant for a professional sports team. The head coach wants data-driven recommendations — and you''re the one who has to find the patterns in thousands of rows of game stats.',
  '[
    {"stage_number": 1, "title": "Stats Dive", "type": "research", "duration_days": 2, "description": "Explore real game data to identify patterns in player performance."},
    {"stage_number": 2, "title": "Analysis Sprint", "type": "experiment", "duration_days": 3, "description": "Build visualizations that reveal insights the coaching staff has not seen."},
    {"stage_number": 3, "title": "Coach Presentation", "type": "simulate", "duration_days": 2, "description": "Present your findings to the coaching staff and field questions."},
    {"stage_number": 4, "title": "Analytics Report", "type": "present", "duration_days": 2, "description": "Write a strategy memo with data visualizations and a clear recommendation."}
  ]'::jsonb
),

-- Template 7: The Climate Engineer
(
  'The Climate Engineer',
  'A coastal city faces rising seas. Can your team design a solution before the next storm?',
  'Students become climate adaptation engineers for a real coastal city, evaluating 3 strategies using ratio math and systems thinking, then pitching to a simulated city council.',
  'engineering',
  ARRAY['Environment', 'Science', 'Building'],
  '6-8',
  12,
  ARRAY['6.RP.A.1', 'W.6.1', 'NGSS.MS-ETS1-1', 'MP1'],
  ARRAY['dq', 'si', 'auth', 'sv', 'pp', 'cr'],
  14, 4.8, true,
  'The city of Portside is underwater — figuratively, not yet literally. Rising seas, stronger storms, and failing infrastructure mean the city council has 90 days to pick an adaptation strategy. They''ve hired your engineering firm. The clock is ticking.',
  '[
    {"stage_number": 1, "title": "Threat Assessment", "type": "research", "duration_days": 2, "description": "Analyze sea-level projection data, flood maps, and infrastructure reports for Portside."},
    {"stage_number": 2, "title": "Strategy Comparison", "type": "experiment", "duration_days": 3, "description": "Evaluate three adaptation strategies using cost/benefit ratios."},
    {"stage_number": 3, "title": "Community Tradeoffs", "type": "simulate", "duration_days": 2, "description": "Role-play a community meeting with stakeholders who have conflicting priorities."},
    {"stage_number": 4, "title": "City Council Pitch", "type": "present", "duration_days": 3, "description": "Present your engineering recommendation with data visualizations and a written proposal."},
    {"stage_number": 5, "title": "Systems Debrief", "type": "reflect", "duration_days": 2, "description": "Reflect on complex systems thinking and the tradeoffs engineers face in the real world."}
  ]'::jsonb
),

-- Template 8: Story Architects
(
  'Story Architects: Writing That Changes Minds',
  'Can a well-crafted story actually change how someone thinks? Prove it.',
  'Students become writers-in-residence at a digital publishing house, crafting opinion and narrative pieces for a real audience.',
  'writing',
  ARRAY['Writing', 'Art', 'Reading'],
  '3-5',
  8,
  ARRAY['W.4.1', 'W.5.2', 'SL.3.4'],
  ARRAY['sv', 'cr', 'pp', 'ref'],
  11, 4.6, true,
  'Inkwell Publishing has just launched a student writing imprint — but they only accept pieces that have gone through at least three rounds of revision and have a real point of view. You''ve been accepted as a writer-in-residence.',
  '[
    {"stage_number": 1, "title": "Finding Your Angle", "type": "research", "duration_days": 2, "description": "Choose a topic you care about. Research both sides of the argument and find your voice."},
    {"stage_number": 2, "title": "First Draft", "type": "experiment", "duration_days": 2, "description": "Write a complete first draft opinion piece. Share with a partner for peer review."},
    {"stage_number": 3, "title": "Editor Desk", "type": "simulate", "duration_days": 1, "description": "Pitch your piece to the AI editor. Answer tough questions and get revision notes."},
    {"stage_number": 4, "title": "Final Submission", "type": "present", "duration_days": 2, "description": "Submit your final revised piece to the Inkwell collection. Read aloud to the group."},
    {"stage_number": 5, "title": "Writer Reflection", "type": "reflect", "duration_days": 1, "description": "Compare your first draft to your final. What changed? What does revision mean to you now?"}
  ]'::jsonb
);
