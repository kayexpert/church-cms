-- Function to check if another function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean AS $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_type = 'FUNCTION'
    AND routine_schema = 'public'
    AND routine_name = function_name
  ) INTO func_exists;

  RETURN func_exists;
END;
$$ LANGUAGE plpgsql;

-- Create a view to check function existence (fallback for when check_function_exists doesn't exist)
CREATE OR REPLACE VIEW _functions_check AS
SELECT
  routine_name as function_name,
  TRUE as exists
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND routine_schema = 'public';

-- Function to get upcoming birthdays
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(days_ahead integer)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  marital_status text,
  primary_phone_number text,
  email text,
  profile_image text,
  status text,
  days_until integer
) AS $$
BEGIN
  RETURN QUERY
  WITH birthdays AS (
    SELECT
      m.*,
      CASE
        WHEN (DATE_PART('month', m.date_of_birth) > DATE_PART('month', CURRENT_DATE)) OR
             (DATE_PART('month', m.date_of_birth) = DATE_PART('month', CURRENT_DATE) AND
              DATE_PART('day', m.date_of_birth) >= DATE_PART('day', CURRENT_DATE))
        THEN
          (DATE(DATE_PART('year', CURRENT_DATE) || '-' ||
                DATE_PART('month', m.date_of_birth) || '-' ||
                DATE_PART('day', m.date_of_birth)) - CURRENT_DATE)
        ELSE
          (DATE((DATE_PART('year', CURRENT_DATE) + 1) || '-' ||
                DATE_PART('month', m.date_of_birth) || '-' ||
                DATE_PART('day', m.date_of_birth)) - CURRENT_DATE)
      END AS days_until
    FROM members m
    WHERE m.date_of_birth IS NOT NULL
  )
  SELECT
    b.id,
    b.first_name,
    b.last_name,
    b.date_of_birth,
    b.gender,
    b.marital_status,
    b.primary_phone_number,
    b.email,
    b.profile_image,
    b.status,
    b.days_until
  FROM birthdays b
  WHERE b.days_until <= days_ahead
  ORDER BY b.days_until;
END;
$$ LANGUAGE plpgsql;

-- Function to get gender distribution
CREATE OR REPLACE FUNCTION get_gender_distribution()
RETURNS TABLE (
  name text,
  value bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN gender = 'male' THEN 'Male'
      WHEN gender = 'female' THEN 'Female'
      ELSE 'Other'
    END AS name,
    COUNT(*) AS value
  FROM members
  WHERE gender IS NOT NULL
  GROUP BY
    CASE
      WHEN gender = 'male' THEN 'Male'
      WHEN gender = 'female' THEN 'Female'
      ELSE 'Other'
    END
  ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- Function to get department distribution
CREATE OR REPLACE FUNCTION get_department_distribution()
RETURNS TABLE (
  name text,
  value bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.name,
    COUNT(md.member_id) AS value
  FROM departments d
  LEFT JOIN member_departments md ON d.id = md.department_id
  GROUP BY d.name
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get member statistics in a single query
CREATE OR REPLACE FUNCTION get_member_stats()
RETURNS TABLE (
  total_members bigint,
  active_members bigint,
  inactive_members bigint,
  new_members_this_month bigint
) AS $$
DECLARE
  first_day_of_month timestamp;
BEGIN
  -- Calculate first day of current month
  first_day_of_month := date_trunc('month', current_date);

  -- Return all stats in one query
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM members) AS total_members,
    (SELECT COUNT(*) FROM members WHERE status = 'active') AS active_members,
    (SELECT COUNT(*) FROM members WHERE status = 'inactive') AS inactive_members,
    (SELECT COUNT(*) FROM members WHERE created_at >= first_day_of_month) AS new_members_this_month;
END;
$$ LANGUAGE plpgsql;

-- Function to get member status distribution
CREATE OR REPLACE FUNCTION get_status_distribution()
RETURNS TABLE (
  name text,
  value bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN status = 'active' THEN 'Active'
      WHEN status = 'inactive' THEN 'Inactive'
      ELSE 'Unknown'
    END AS name,
    COUNT(*) AS value
  FROM members
  GROUP BY
    CASE
      WHEN status = 'active' THEN 'Active'
      WHEN status = 'inactive' THEN 'Inactive'
      ELSE 'Unknown'
    END
  ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- Function to get member growth over the last 6 months
CREATE OR REPLACE FUNCTION get_member_growth()
RETURNS TABLE (
  month text,
  year text,
  month_year text,
  members bigint,
  month_index integer
) AS $$
DECLARE
  current_date_value date := current_date;
  month_date date;
BEGIN
  -- Create a temporary table to store results
  CREATE TEMP TABLE IF NOT EXISTS temp_growth_data (
    month text,
    year text,
    month_year text,
    members bigint,
    month_index integer
  ) ON COMMIT DROP;

  -- Clear any existing data
  DELETE FROM temp_growth_data;

  -- Calculate data for each month
  FOR i IN 0..5 LOOP
    -- Calculate the first day of each month, going back 5 months
    month_date := date_trunc('month', current_date_value - (i * interval '1 month'))::date;

    -- Count members who were created in this month (based on created_at timestamp)
    INSERT INTO temp_growth_data
    SELECT
      to_char(month_date, 'Mon') AS month,
      to_char(month_date, 'YY') AS year,
      to_char(month_date, 'Mon ''YY') AS month_year,
      COUNT(*) AS members,
      i AS month_index
    FROM members
    WHERE
      created_at IS NOT NULL AND
      date_trunc('month', created_at) = date_trunc('month', month_date);
  END LOOP;

  -- Return the data in chronological order (oldest first)
  RETURN QUERY
  SELECT * FROM temp_growth_data
  ORDER BY month_index DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get birthdays in current month
CREATE OR REPLACE FUNCTION get_birthdays_this_month()
RETURNS TABLE (
  count bigint
) AS $$
DECLARE
  current_month integer;
BEGIN
  -- Get current month
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  -- Return count of members with birthdays in current month
  RETURN QUERY
  SELECT COUNT(*)
  FROM members
  WHERE
    date_of_birth IS NOT NULL AND
    EXTRACT(MONTH FROM date_of_birth) = current_month;
END;
$$ LANGUAGE plpgsql;

-- Function to get attendance trend data for the last 6 months
CREATE OR REPLACE FUNCTION get_attendance_trend()
RETURNS TABLE (
  month text,
  year text,
  month_year text,
  attendance_rate numeric
) AS $$
DECLARE
  current_date_value date := current_date;
  month_date date;
  i integer;
  total_members bigint;
  present_members bigint;
  rate numeric;
BEGIN
  -- Get the total number of active members
  SELECT COUNT(*) INTO total_members FROM members WHERE status = 'active';

  -- If no members, return zero rates
  IF total_members = 0 THEN
    FOR i IN 0..5 LOOP
      month_date := date_trunc('month', current_date_value - (i * interval '1 month'))::date;
      RETURN QUERY
      SELECT
        to_char(month_date, 'Mon') AS month,
        to_char(month_date, 'YY') AS year,
        to_char(month_date, 'Mon ''YY') AS month_year,
        0::numeric AS attendance_rate;
    END LOOP;
    RETURN;
  END IF;

  -- Calculate attendance rates for each month
  FOR i IN 0..5 LOOP
    -- Calculate the first day of each month, going back 5 months
    month_date := date_trunc('month', current_date_value - (i * interval '1 month'))::date;

    -- Count members marked as present in attendance records for this month
    SELECT COUNT(DISTINCT m.member_id) INTO present_members
    FROM attendance_records m
    JOIN attendance a ON m.attendance_id = a.id
    WHERE
      m.present = true AND
      date_trunc('month', a.date::date) = date_trunc('month', month_date);

    -- Calculate attendance rate (default to 0 if no records)
    IF present_members IS NULL THEN
      rate := 0;
    ELSE
      rate := (present_members::numeric / total_members::numeric) * 100;
    END IF;

    -- Return the month data
    RETURN QUERY
    SELECT
      to_char(month_date, 'Mon') AS month,
      to_char(month_date, 'YY') AS year,
      to_char(month_date, 'Mon ''YY') AS month_year,
      ROUND(rate, 1) AS attendance_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get members with filters
CREATE OR REPLACE FUNCTION get_filtered_members(
  status_filter text DEFAULT NULL,
  search_term text DEFAULT NULL,
  page_number integer DEFAULT 1,
  items_per_page integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  marital_status text,
  spouse_name text,
  number_of_children text,
  primary_phone_number text,
  secondary_phone_number text,
  email text,
  address text,
  occupation text,
  profile_image text,
  covenant_family_id uuid,
  status text,
  membership_date date,
  baptism_date date,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
) AS $$
DECLARE
  offset_val integer;
BEGIN
  offset_val := (page_number - 1) * items_per_page;

  RETURN QUERY
  WITH filtered_members AS (
    SELECT *
    FROM members m
    WHERE
      (status_filter IS NULL OR status_filter = 'all' OR m.status = status_filter)
      AND
      (search_term IS NULL OR
       m.first_name ILIKE '%' || search_term || '%' OR
       m.last_name ILIKE '%' || search_term || '%' OR
       m.email ILIKE '%' || search_term || '%' OR
       m.primary_phone_number ILIKE '%' || search_term || '%')
  ),
  counted_members AS (
    SELECT COUNT(*) AS total_count FROM filtered_members
  )
  SELECT
    fm.*,
    cm.total_count
  FROM filtered_members fm, counted_members cm
  ORDER BY fm.first_name, fm.last_name
  LIMIT items_per_page
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
