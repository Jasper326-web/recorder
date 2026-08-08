alter table public.entries
add column if not exists abstinence_status text not null default '想都没想';

alter table public.entries
drop constraint if exists entries_abstinence_status_check;

alter table public.entries
add constraint entries_abstinence_status_check
check (
  abstinence_status in (
    '想都没想',
    '有点念头',
    '念头很强',
    '看过片了',
    '上手了',
    '只x 没射',
    '破戒了'
  )
);

create index if not exists entries_user_abstinence_status_idx
  on public.entries (user_id, abstinence_status);
