-- Function to get most borrowed books
CREATE OR REPLACE FUNCTION public.get_most_borrowed_books(limit_count integer)
RETURNS TABLE (
  book_id uuid,
  title text,
  author text,
  borrow_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    COUNT(br.id) as borrow_count
  FROM books b
  LEFT JOIN borrowing_records br ON b.id = br.book_id
  GROUP BY b.id, b.title, b.author
  ORDER BY borrow_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get students with highest fines
CREATE OR REPLACE FUNCTION public.get_students_with_highest_fines(limit_count integer)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  total_fines numeric,
  paid_fines numeric,
  pending_fines numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(SUM(f.amount), 0) as total_fines,
    COALESCE(SUM(CASE WHEN f.status = 'Paid' THEN f.amount ELSE 0 END), 0) as paid_fines,
    COALESCE(SUM(CASE WHEN f.status = 'Pending' THEN f.amount ELSE 0 END), 0) as pending_fines
  FROM users u
  LEFT JOIN borrowing_records br ON u.id = br.user_id
  LEFT JOIN fines f ON br.id = f.borrowing_record_id
  WHERE u.role = 'Student'
  GROUP BY u.id, u.name, u.email
  ORDER BY total_fines DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue books
CREATE OR REPLACE FUNCTION public.get_overdue_books()
RETURNS TABLE (
  book_id uuid,
  title text,
  author text,
  user_name text,
  borrowed_date timestamp,
  due_date timestamp,
  days_overdue integer,
  fine_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    u.name as user_name,
    br.borrowed_date,
    br.due_date,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - br.due_date))::integer as days_overdue,
    COALESCE(f.amount, 0) as fine_amount
  FROM books b
  JOIN borrowing_records br ON b.id = br.book_id
  JOIN users u ON br.user_id = u.id
  LEFT JOIN fines f ON br.id = f.borrowing_record_id AND f.status = 'Pending'
  WHERE br.status = 'Overdue'
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql;