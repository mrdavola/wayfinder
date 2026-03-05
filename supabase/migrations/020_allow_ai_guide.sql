-- Add allow_ai_guide toggle to students table
-- Controls whether AI Field Guide chatbot is available on student-created projects
ALTER TABLE students ADD COLUMN IF NOT EXISTS allow_ai_guide BOOLEAN DEFAULT TRUE;
