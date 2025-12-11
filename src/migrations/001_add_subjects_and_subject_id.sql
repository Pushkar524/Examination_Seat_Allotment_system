-- Migration: Add subjects table and subject_id to seat_allotments
-- This migration makes seat allocations subject-aware for multi-subject support

-- Step 1: Create subjects table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  subject_code VARCHAR(50) UNIQUE NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  exam_date DATE,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_date ON subjects(exam_date);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(subject_code);

-- Step 2: Add subject_id column to seat_allotments (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seat_allotments' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE seat_allotments 
    ADD COLUMN subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE;
    
    COMMENT ON COLUMN seat_allotments.subject_id IS 'Links allocation to specific subject for multi-subject support';
  END IF;
END $$;

-- Step 3: Migrate existing data from exam_subjects to subjects (if any)
-- This is safe to run multiple times
INSERT INTO subjects (subject_code, subject_name, department, exam_date, start_time, end_time)
SELECT 
  COALESCE(es.subject_code, 'SUBJ' || es.id) as subject_code,
  es.subject_name,
  COALESCE(
    (SELECT DISTINCT s.department FROM students s LIMIT 1),
    'General'
  ) as department,
  es.exam_date,
  es.start_time,
  es.end_time
FROM exam_subjects es
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub 
  WHERE sub.subject_code = COALESCE(es.subject_code, 'SUBJ' || es.id)
)
ON CONFLICT (subject_code) DO NOTHING;

-- Step 4: Update existing seat_allotments to link to subjects (if subject column exists)
-- This links old string-based subjects to new subjects table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seat_allotments' AND column_name = 'subject'
  ) THEN
    -- Try to match old subject strings to new subjects table
    UPDATE seat_allotments sa
    SET subject_id = sub.id
    FROM subjects sub
    WHERE sa.subject IS NOT NULL 
      AND sa.subject_id IS NULL
      AND (
        sub.subject_code = sa.subject 
        OR sub.subject_name = sa.subject
      );
  END IF;
END $$;

-- Step 5: Drop old unique constraint and add new one with subject_id
ALTER TABLE seat_allotments DROP CONSTRAINT IF EXISTS seat_allotments_room_id_seat_number_exam_id_key;
ALTER TABLE seat_allotments DROP CONSTRAINT IF EXISTS seat_allotments_unique;
ALTER TABLE seat_allotments DROP CONSTRAINT IF EXISTS seat_allotments_room_seat_subject_unique;

-- New unique constraint: same room/seat can be used for different subjects
ALTER TABLE seat_allotments 
ADD CONSTRAINT seat_allotments_room_seat_subject_unique 
UNIQUE(room_id, seat_number, subject_id);

-- Step 6: Add validation triggers (optional but recommended)
-- Validate student department matches subject department
CREATE OR REPLACE FUNCTION validate_student_department()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subject_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM students s
      JOIN subjects sub ON sub.department = s.department
      WHERE s.id = NEW.student_id AND sub.id = NEW.subject_id
    ) THEN
      RAISE EXCEPTION 'Student department does not match subject department';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_student_department ON seat_allotments;
CREATE TRIGGER check_student_department
  BEFORE INSERT OR UPDATE ON seat_allotments
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_department();

-- Validate seat number doesn't exceed room capacity
CREATE OR REPLACE FUNCTION validate_room_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = NEW.room_id AND NEW.seat_number <= r.capacity
  ) THEN
    RAISE EXCEPTION 'Seat number exceeds room capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_room_capacity ON seat_allotments;
CREATE TRIGGER check_room_capacity
  BEFORE INSERT OR UPDATE ON seat_allotments
  FOR EACH ROW
  EXECUTE FUNCTION validate_room_capacity();

-- Step 7: Create helpful views
CREATE OR REPLACE VIEW student_exam_schedule AS
SELECT 
  s.id as student_id,
  s.roll_no,
  s.name as student_name,
  s.department,
  sub.subject_code,
  sub.subject_name,
  sub.exam_date,
  sub.start_time,
  sub.end_time,
  r.room_no,
  sa.seat_number
FROM seat_allotments sa
JOIN students s ON sa.student_id = s.id
JOIN subjects sub ON sa.subject_id = sub.id
JOIN rooms r ON sa.room_id = r.id
ORDER BY s.roll_no, sub.exam_date, sub.start_time;

CREATE OR REPLACE VIEW subject_allocation_summary AS
SELECT 
  sub.id as subject_id,
  sub.subject_code,
  sub.subject_name,
  sub.department,
  sub.exam_date,
  sub.start_time,
  sub.end_time,
  COUNT(sa.id) as allocated_seats,
  COUNT(DISTINCT sa.room_id) as rooms_used
FROM subjects sub
LEFT JOIN seat_allotments sa ON sub.id = sa.subject_id
GROUP BY sub.id, sub.subject_code, sub.subject_name, sub.department, 
         sub.exam_date, sub.start_time, sub.end_time
ORDER BY sub.exam_date, sub.start_time;

-- Print migration summary
DO $$
DECLARE
  subjects_count INT;
  allotments_count INT;
  linked_count INT;
BEGIN
  SELECT COUNT(*) INTO subjects_count FROM subjects;
  SELECT COUNT(*) INTO allotments_count FROM seat_allotments;
  SELECT COUNT(*) INTO linked_count FROM seat_allotments WHERE subject_id IS NOT NULL;
  
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Subjects table: % records', subjects_count;
  RAISE NOTICE 'Seat allotments: % total, % linked to subjects', allotments_count, linked_count;
END $$;
