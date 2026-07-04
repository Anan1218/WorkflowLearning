create table if not exists review_items (
    id text primary key,
    created_at timestamptz not null default now(),
    model_id text not null,
    status text not null default 'pending',
    document_text text not null,
    submission jsonb not null,
    flagged_fields jsonb not null,
    rationales jsonb not null default '[]'::jsonb
);

create table if not exists review_decisions (
    id bigserial primary key,
    item_id text not null references review_items(id) on delete cascade,
    field_path text not null,
    action text not null,
    override_value jsonb,
    decided_at timestamptz not null default now()
);

create index if not exists review_decisions_item_path_decided_at_idx
    on review_decisions(item_id, field_path, decided_at);
