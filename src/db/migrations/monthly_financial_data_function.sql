-- Function to get monthly financial data (income and expenditure)
-- Used as a fallback for the dashboard if the main function fails

CREATE OR REPLACE FUNCTION get_monthly_financial_data(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  month TEXT,
  month_num TEXT,
  year NUMERIC,
  income NUMERIC,
  expenditure NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(months.month_date, 'Mon') AS month,
    TO_CHAR(months.month_date, 'MM') AS month_num,
    EXTRACT(YEAR FROM months.month_date) AS year,
    COALESCE(income.total, 0) AS income,
    COALESCE(expenditure.total, 0) AS expenditure
  FROM (
    SELECT generate_series(
      DATE_TRUNC('month', p_start_date - INTERVAL '5 months'),
      DATE_TRUNC('month', p_end_date),
      '1 month'::interval
    ) AS month_date
  ) months
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', date) AS month,
      SUM(amount) AS total
    FROM income_entries
    GROUP BY month
  ) income ON months.month_date = income.month
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', date) AS month,
      SUM(amount) AS total
    FROM expenditure_entries
    GROUP BY month
  ) expenditure ON months.month_date = expenditure.month
  ORDER BY months.month_date;
END;
$$ LANGUAGE plpgsql;
