-- Add strict_mode column to exams table
-- strict_mode: true (default) = Final exam mode - strict seating (same subject students cannot sit together)
-- strict_mode: false = Unit test mode - lenient seating (column-wise allocation allowed if different subjects unavailable)

ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS strict_mode BOOLEAN DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN exams.strict_mode IS 'true = Strict mode (final exams) - same subject students cannot sit together. false = Lenient mode (unit tests) - column-wise allocation allowed';
