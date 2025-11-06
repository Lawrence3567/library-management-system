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

-- Fine Rules table (Single Record)
create table public.fine_rules (
  id uuid not null default gen_random_uuid (),
  amount_per_day numeric(10, 2) not null,
  last_updated_by uuid not null,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  constraint fine_rules_pkey primary key (id),
  constraint fine_rules_last_updated_by_fkey foreign key (last_updated_by) references users (id) on delete cascade,
  constraint fine_rules_amount_check check (amount_per_day >= 0),
  constraint fine_rules_single_record check (id = '00000000-0000-0000-0000-000000000000'::uuid)
) TABLESPACE pg_default;

-- Insert the initial fine rule with a fixed ID
insert into public.fine_rules (id, amount_per_day, last_updated_by)
select 
  '00000000-0000-0000-0000-000000000000'::uuid,
  1.00,
  (select id from public.users where role = 'Librarian' limit 1)
where not exists (select 1 from public.fine_rules);

-- Fines table
create table public.fines (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  borrowing_record_id uuid not null,
  fine_rule_id uuid not null,
  amount numeric(10, 2) not null default 0,
  days_overdue integer not null default 0,
  payment_date timestamp without time zone null,
  status text not null default 'Pending'::text,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  constraint fines_pkey primary key (id),
  constraint fines_borrowing_record_id_fkey foreign key (borrowing_record_id) references borrowing_records (id) on delete cascade,
  constraint fines_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint fines_fine_rule_id_fkey foreign key (fine_rule_id) references fine_rules (id) on delete restrict,
  constraint fines_amount_check check (amount >= 0),
  constraint fines_days_overdue_check check (days_overdue >= 0),
  constraint fines_status_check check (
    status = any (array['Pending'::text, 'Paid'::text])
  )
) TABLESPACE pg_default;

create index IF not exists idx_fines_user_id on public.fines using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_fines_status on public.fines using btree (status) TABLESPACE pg_default;
create index IF not exists idx_fines_fine_rule_id on public.fines using btree (fine_rule_id) TABLESPACE pg_default;

-- Ensure only one fine record per borrowing_record (enforces upsert/on-conflict semantics)
create unique index if not exists ux_fines_borrowing_record on public.fines (borrowing_record_id);

