-- Fix: seat_allotments.subject_id should reference exam_subjects, not subjects

-- Drop the incorrect foreign key constraint
ALTER TABLE seat_allotments 
DROP CONSTRAINT IF EXISTS seat_allotments_subject_id_fkey;

-- Add the correct foreign key to exam_subjects
ALTER TABLE seat_allotments 
ADD CONSTRAINT seat_allotments_subject_id_fkey 
FOREIGN KEY (subject_id) 
REFERENCES exam_subjects(id) 
ON DELETE CASCADE;

-- Update the validation function to check exam_subjects instead of subjects
DROP TRIGGER IF EXISTS check_student_department ON seat_allotments;
DROP FUNCTION IF EXISTS validate_student_department();

CREATE OR REPLACE FUNCTION validate_student_department()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that the student and exam_subject exist
  IF NEW.subject_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM students WHERE id = NEW.student_id) THEN
      RAISE EXCEPTION 'Student not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM exam_subjects WHERE id = NEW.subject_id) THEN
      RAISE EXCEPTION 'Subject not found in exam_subjects';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_student_department
  BEFORE INSERT OR UPDATE ON seat_allotments
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_department();
