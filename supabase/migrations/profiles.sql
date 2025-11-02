-- Books table
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author text not null,
  isbn text unique not null,
  quantity integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Users table
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    role text CHECK (role = ANY (ARRAY['Librarian'::text, 'Student'::text])) DEFAULT 'Student'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Borrowings table
create table public.borrowings (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id),
  user_id uuid references public.users(id),  -- Changed from auth.users to public.users
  borrow_date timestamp with time zone default timezone('utc'::text, now()),
  return_date timestamp with time zone,
  status text check (status in ('borrowed', 'returned'))
);