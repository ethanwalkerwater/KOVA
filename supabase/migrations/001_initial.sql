-- ============================================================
-- Kova — Initial Schema
-- Run with: supabase db push  (or paste in Supabase SQL Editor)
-- ============================================================

-- ── PROFILES (extends Supabase Auth) ─────────────────────────────────────────

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  subscription_tier text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on auth.users INSERT
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── CONTACTS ─────────────────────────────────────────────────────────────────

create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,

  -- Identity (extracted from interactions)
  name text not null,
  title text,
  company text,
  email text,
  phone text,
  linkedin_url text,
  location text,

  -- Pipeline (AI-inferred from interaction patterns)
  stage text default 'new_lead'
    check (stage in ('new_lead','contacted','engaged','negotiating','closed_won','closed_lost','dormant')),
  importance text default 'medium'
    check (importance in ('high','medium','low')),
  tags text[] default '{}',
  source text
    check (source in ('voice','card_ocr','text','photo','manual','web_search')),
  last_interaction_at timestamptz,
  next_followup_at timestamptz,
  followup_reason text,

  -- Company Intelligence (AI-extracted)
  company_industry text,
  company_size text,
  company_stage text,
  company_hq text,
  company_description text,

  -- Deal Tracking (AI-inferred)
  deal_value numeric,
  deal_currency text default 'USD',
  deal_probability integer check (deal_probability between 0 and 100),
  expected_close_date date,

  -- AI-Generated (computed on regeneration)
  ai_summary text,
  relationship_score integer check (relationship_score between 0 and 100),
  key_topics text[] default '{}',
  suggested_next_step text,

  -- System
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contacts enable row level security;

create policy "Users access own contacts"
  on public.contacts for all using (auth.uid() = owner_id);

-- Full-text search index across identity + AI fields
create index contacts_search_idx on public.contacts
  using gin(to_tsvector('simple',
    coalesce(name,'') || ' ' ||
    coalesce(company,'') || ' ' ||
    coalesce(title,'') || ' ' ||
    coalesce(ai_summary,'') || ' ' ||
    coalesce(company_description,'') || ' ' ||
    array_to_string(tags, ' ') || ' ' ||
    array_to_string(key_topics, ' ')
  ));

-- Index for sorting by most-recently-active
create index contacts_owner_last_interaction_idx
  on public.contacts (owner_id, last_interaction_at desc nulls last);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.set_updated_at();

-- ── INTERACTIONS (append-only source of truth) ────────────────────────────────

create table public.interactions (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,

  type text not null
    check (type in (
      'voice_memo',       -- voice recording transcription
      'text_note',        -- manually typed note
      'photo',            -- photo with optional caption
      'meeting_note',     -- structured meeting note
      'email_snippet',    -- pasted email excerpt
      'ai_research',      -- AI web search results
      'followup_done',    -- user marked follow-up complete
      'followup_skipped', -- user deferred follow-up
      'card_scan',        -- business card OCR result
      'import'            -- imported from external source
    )),

  raw_content text not null,
  media_url text,
  source_context text,
  ai_generated boolean default false,

  created_at timestamptz default now()
  -- NOTE: no updated_at — interactions are immutable
);

alter table public.interactions enable row level security;

create policy "Users access own interactions"
  on public.interactions for all using (auth.uid() = owner_id);

-- Chronological fetch by contact (the hot path)
create index interactions_contact_idx
  on public.interactions (contact_id, created_at desc);

-- Owner-level index for listing recent activity
create index interactions_owner_idx
  on public.interactions (owner_id, created_at desc);

-- ── SECTIONS (AI-regenerated markdown views) ─────────────────────────────────

create table public.sections (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,

  slug text not null,
  title text not null,
  content_md text default '',
  summary text,

  -- Provenance + anti-hallucination
  source_interaction_ids uuid[] default '{}',
  regenerated_at timestamptz default now(),
  interaction_count integer default 0,

  -- User override escape hatch
  user_overrides_md text,
  overridden_at timestamptz,
  override_reason text,

  unique(contact_id, slug)
);

alter table public.sections enable row level security;

create policy "Users access own sections"
  on public.sections for all
  using (contact_id in (select id from public.contacts where owner_id = auth.uid()));

-- Full-text search across section content
create index sections_search_idx on public.sections
  using gin(to_tsvector('simple', coalesce(content_md,'') || ' ' || coalesce(summary,'')));

-- ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

-- Called from /api/regenerate after sections are upserted — updates the
-- contact's last_interaction_at and updated_at timestamps in one shot.
create or replace function public.touch_contact(p_contact_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.contacts
  set
    last_interaction_at = (
      select max(created_at) from public.interactions
      where contact_id = p_contact_id
    ),
    updated_at = now()
  where id = p_contact_id;
end;
$$;
