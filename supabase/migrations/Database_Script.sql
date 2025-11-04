-- Books table
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author text not null,
  isbn text unique not null,
  total_copies integer not null default 1,
  available_copies integer not null default 1,
  category text not null,
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

-- Borrow Requests table
create table public.borrow_requests (
  id uuid not null default gen_random_uuid (),
  book_id uuid not null,
  user_id uuid not null,
  status text not null default 'Pending Approval'::text,
  requested_date timestamp without time zone null default now(),
  approval_date timestamp without time zone null,
  rejection_reason text null,
  created_at timestamp without time zone null default now(),
  constraint borrow_requests_pkey primary key (id),
  constraint borrow_requests_book_id_user_id_status_key unique (book_id, user_id, status),
  constraint borrow_requests_book_id_fkey foreign KEY (book_id) references books (id) on delete RESTRICT,
  constraint borrow_requests_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint fk_borrow_requests_users foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint borrow_requests_status_check check (
    (
      status = any (
        array[
          'Pending Approval'::text,
          'Issued'::text,
          'Rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_borrow_requests_user_id on public.borrow_requests using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_borrow_requests_status on public.borrow_requests using btree (status) TABLESPACE pg_default;


-- Borrowing Records table
create table public.borrowing_records (
  id uuid not null default gen_random_uuid (),
  book_id uuid not null,
  user_id uuid not null,
  borrowed_date timestamp without time zone null default now(),
  due_date timestamp without time zone not null,
  returned_date timestamp without time zone null,
  status text not null default 'Active'::text,
  created_at timestamp without time zone null default now(),
  constraint borrowing_records_pkey primary key (id),
  constraint borrowing_records_book_id_fkey foreign KEY (book_id) references books (id) on delete RESTRICT,
  constraint borrowing_records_user_id_fk foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint borrowing_records_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint borrowing_records_status_check check (
    (
      status = any (
        array['Active'::text, 'Returned'::text, 'Overdue'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_borrowing_records_user_id on public.borrowing_records using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_borrowing_records_status on public.borrowing_records using btree (status) TABLESPACE pg_default;