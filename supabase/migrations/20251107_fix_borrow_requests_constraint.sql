-- Drop the existing constraint
ALTER TABLE public.borrow_requests
DROP CONSTRAINT IF EXISTS borrow_requests_book_id_user_id_status_key;

-- Create a unique index that only prevents duplicate pending requests
CREATE UNIQUE INDEX borrow_requests_pending_unique 
ON public.borrow_requests (book_id, user_id) 
WHERE status = 'Pending Approval';