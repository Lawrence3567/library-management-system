-- Create function to increment available copies when request is rejected
CREATE OR REPLACE FUNCTION increment_available_copies(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies + 1
  WHERE id = book_id;
END;
$$;