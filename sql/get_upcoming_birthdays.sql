-- SQL function to get upcoming birthdays
-- This function calculates upcoming birthdays within the specified number of days
-- It handles year boundaries correctly and returns days until birthday for sorting

CREATE OR REPLACE FUNCTION get_upcoming_birthdays(days_ahead INT)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  profile_image TEXT,
  status TEXT,
  days_until INT
) AS $$
BEGIN
  RETURN QUERY
  WITH birthdays AS (
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.profile_image,
      m.status,
      -- Calculate days until next birthday
      CASE
        -- If this year's birthday has passed, calculate days until next year's birthday
        WHEN TO_CHAR(CURRENT_DATE, 'MM-DD') > TO_CHAR(m.date_of_birth, 'MM-DD') THEN
          (DATE(DATE_PART('year', CURRENT_DATE) + 1 || '-' || TO_CHAR(m.date_of_birth, 'MM-DD')) - CURRENT_DATE)::INT
        -- Otherwise, calculate days until this year's birthday
        ELSE
          (DATE(DATE_PART('year', CURRENT_DATE) || '-' || TO_CHAR(m.date_of_birth, 'MM-DD')) - CURRENT_DATE)::INT
      END AS days_until
    FROM members m
    WHERE m.date_of_birth IS NOT NULL
  )
  SELECT 
    b.id,
    b.first_name,
    b.last_name,
    b.date_of_birth,
    b.profile_image,
    b.status,
    b.days_until
  FROM birthdays b
  WHERE b.days_until BETWEEN 0 AND days_ahead
  ORDER BY b.days_until;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_upcoming_birthdays(30);
