alter table case_evaluations
add column if not exists status varchar(32);

update case_records
set status = 'OPEN'
where status is null or status = 'ACTIVE';

update case_evaluations
set status = 'COMPLETED'
where status is null;

alter table case_evaluations
alter column status set not null;
