-- Create function to decrement available copies
CREATE OR REPLACE FUNCTION decrement_available_copies(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies - 1
  WHERE id = book_id AND available_copies > 0;
END;
$$;