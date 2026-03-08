-- Add Social Studies skills to the skills catalog
-- These were missing from the original 012 seed, causing the radar chart
-- to show 0% target for the Social Studies domain.

INSERT INTO skills (name, category, description, icon, standards, grade_bands, sort_order) VALUES
  ('History & Civics', 'core', 'Understanding historical events, government, and civic responsibility', 'landmark', ARRAY['SS.H', 'SS.C'], ARRAY['3-5','6-8','9-12'], 8),
  ('Geography & Culture', 'core', 'Exploring places, cultures, and human-environment interaction', 'globe', ARRAY['SS.G'], ARRAY['K-2','3-5','6-8','9-12'], 9),
  ('Economics & Financial Literacy', 'interest', 'Understanding money, trade, markets, and personal finance', 'coins', ARRAY['SS.E'], ARRAY['3-5','6-8','9-12'], 30)
ON CONFLICT DO NOTHING;
