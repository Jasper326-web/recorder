alter table public.entries
drop constraint if exists entries_abstinence_status_check;

alter table public.entries
add constraint entries_abstinence_status_check
check (
  abstinence_status in (
    '清心寡欲',
    '起心动念',
    '心神不宁',
    '欲望冲脑',
    '千钧一发',
    '极度危急'
  )
);

update public.entries
set abstinence_status = '清心寡欲'
where abstinence_status is null or abstinence_status not in (
  '清心寡欲',
  '起心动念',
  '心神不宁',
  '欲望冲脑',
  '千钧一发',
  '极度危急'
);

alter table public.entries
alter column abstinence_status set default '清心寡欲';
