-- Function to check if another function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_proc.proname = function_name
    AND pg_namespace.nspname = 'public'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming events
CREATE OR REPLACE FUNCTION get_upcoming_events(days_ahead integer DEFAULT 7)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  date date,
  end_date date,
  location text,
  type text,
  organizer text,
  category_id uuid,
  status text,
  recurrence text,
  color text,
  department_id uuid,
  is_all_day boolean,
  start_time text,
  end_time text,
  created_at timestamptz,
  updated_at timestamptz,
  category_name text,
  category_color text,
  department_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date,
    e.end_date,
    e.location,
    e.type,
    e.organizer,
    e.category_id,
    e.status,
    e.recurrence,
    e.color,
    e.department_id,
    e.is_all_day,
    e.start_time,
    e.end_time,
    e.created_at,
    e.updated_at,
    c.name AS category_name,
    c.color AS category_color,
    d.name AS department_name
  FROM 
    events e
    LEFT JOIN event_categories c ON e.category_id = c.id
    LEFT JOIN departments d ON e.department_id = d.id
  WHERE 
    e.date >= CURRENT_DATE
    AND e.date <= CURRENT_DATE + days_ahead
    AND (e.status = 'upcoming' OR e.status = 'ongoing')
  ORDER BY 
    e.date ASC, 
    CASE WHEN e.is_all_day THEN '00:00' ELSE COALESCE(e.start_time, '00:00') END ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats()
RETURNS TABLE (
  total_events bigint,
  upcoming_events bigint,
  ongoing_events bigint,
  completed_events bigint,
  cancelled_events bigint,
  events_this_month bigint,
  events_next_month bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM events) AS total_events,
    (SELECT COUNT(*) FROM events WHERE status = 'upcoming') AS upcoming_events,
    (SELECT COUNT(*) FROM events WHERE status = 'ongoing') AS ongoing_events,
    (SELECT COUNT(*) FROM events WHERE status = 'completed') AS completed_events,
    (SELECT COUNT(*) FROM events WHERE status = 'cancelled') AS cancelled_events,
    (SELECT COUNT(*) FROM events WHERE 
      date >= date_trunc('month', CURRENT_DATE) AND 
      date < date_trunc('month', CURRENT_DATE) + interval '1 month'
    ) AS events_this_month,
    (SELECT COUNT(*) FROM events WHERE 
      date >= date_trunc('month', CURRENT_DATE) + interval '1 month' AND 
      date < date_trunc('month', CURRENT_DATE) + interval '2 month'
    ) AS events_next_month;
END;
$$ LANGUAGE plpgsql;

-- Function to get events by category
CREATE OR REPLACE FUNCTION get_events_by_category()
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_color text,
  event_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    COUNT(e.id) AS event_count
  FROM
    event_categories c
    LEFT JOIN events e ON c.id = e.category_id
  GROUP BY
    c.id, c.name, c.color
  ORDER BY
    event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get filtered events
CREATE OR REPLACE FUNCTION get_filtered_events(
  start_date_param date DEFAULT NULL,
  end_date_param date DEFAULT NULL,
  status_param text DEFAULT NULL,
  category_id_param uuid DEFAULT NULL,
  department_id_param uuid DEFAULT NULL,
  search_term text DEFAULT NULL,
  page_number integer DEFAULT 1,
  items_per_page integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  date date,
  end_date date,
  location text,
  type text,
  organizer text,
  category_id uuid,
  status text,
  recurrence text,
  color text,
  department_id uuid,
  is_all_day boolean,
  start_time text,
  end_time text,
  created_at timestamptz,
  updated_at timestamptz,
  category_name text,
  category_color text,
  department_name text,
  total_count bigint
) AS $$
DECLARE
  offset_val integer;
BEGIN
  offset_val := (page_number - 1) * items_per_page;
  
  RETURN QUERY
  WITH filtered_events AS (
    SELECT 
      e.id,
      e.title,
      e.description,
      e.date,
      e.end_date,
      e.location,
      e.type,
      e.organizer,
      e.category_id,
      e.status,
      e.recurrence,
      e.color,
      e.department_id,
      e.is_all_day,
      e.start_time,
      e.end_time,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      d.name AS department_name
    FROM 
      events e
      LEFT JOIN event_categories c ON e.category_id = c.id
      LEFT JOIN departments d ON e.department_id = d.id
    WHERE 
      (start_date_param IS NULL OR e.date >= start_date_param) AND
      (end_date_param IS NULL OR e.date <= end_date_param) AND
      (status_param IS NULL OR e.status = status_param) AND
      (category_id_param IS NULL OR e.category_id = category_id_param) AND
      (department_id_param IS NULL OR e.department_id = department_id_param) AND
      (search_term IS NULL OR 
        e.title ILIKE '%' || search_term || '%' OR 
        e.description ILIKE '%' || search_term || '%' OR
        e.location ILIKE '%' || search_term || '%' OR
        e.organizer ILIKE '%' || search_term || '%')
  )
  SELECT 
    fe.*,
    (SELECT COUNT(*) FROM filtered_events) AS total_count
  FROM 
    filtered_events fe
  ORDER BY 
    fe.date ASC, 
    CASE WHEN fe.is_all_day THEN '00:00' ELSE COALESCE(fe.start_time, '00:00') END ASC
  LIMIT items_per_page
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
