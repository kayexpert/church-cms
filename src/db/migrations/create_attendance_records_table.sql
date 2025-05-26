-- Create attendance_records table migration
-- This table normalizes attendance data by storing individual member attendance records
-- separately from the main attendance event record

-- Create attendance_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attendance_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_id ON attendance_records(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_member_id ON attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_present ON attendance_records(present);

-- Enable Row Level Security
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_records
CREATE POLICY "Allow select for authenticated users" ON attendance_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON attendance_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON attendance_records
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON attendance_records
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();
