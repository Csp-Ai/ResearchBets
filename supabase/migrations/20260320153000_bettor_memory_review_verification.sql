alter table if exists public.bettor_artifacts
  drop constraint if exists bettor_artifacts_verification_status_check;

alter table if exists public.bettor_slips
  drop constraint if exists bettor_slips_verification_status_check;

alter table if exists public.bettor_slip_legs
  drop constraint if exists bettor_slip_legs_verification_status_check;

alter table if exists public.bettor_account_activity_imports
  drop constraint if exists bettor_account_activity_imports_verification_status_check;

alter table if exists public.bettor_artifacts
  add column if not exists data_source text not null default 'raw_upload' check (data_source in ('raw_upload', 'parser_output', 'demo_parse', 'bettor_verified')),
  add column if not exists parser_confidence_label text,
  add column if not exists review_notes_json jsonb,
  add column if not exists last_reviewed_at timestamptz,
  add constraint bettor_artifacts_verification_status_check check (verification_status in ('uploaded', 'parse_pending', 'parsed_demo', 'parsed_unverified', 'needs_review', 'verified', 'rejected'));

alter table if exists public.bettor_slips
  add column if not exists data_source text not null default 'parser_output' check (data_source in ('raw_upload', 'parser_output', 'demo_parse', 'bettor_verified')),
  add column if not exists parse_snapshot_json jsonb,
  add column if not exists verified_snapshot_json jsonb,
  add column if not exists last_reviewed_at timestamptz,
  add constraint bettor_slips_verification_status_check check (verification_status in ('uploaded', 'parse_pending', 'parsed_demo', 'parsed_unverified', 'needs_review', 'verified', 'rejected'));

alter table if exists public.bettor_slip_legs
  add column if not exists data_source text not null default 'parser_output' check (data_source in ('raw_upload', 'parser_output', 'demo_parse', 'bettor_verified')),
  add column if not exists parse_snapshot_json jsonb,
  add column if not exists verified_snapshot_json jsonb,
  add column if not exists last_reviewed_at timestamptz,
  add constraint bettor_slip_legs_verification_status_check check (verification_status in ('uploaded', 'parse_pending', 'parsed_demo', 'parsed_unverified', 'needs_review', 'verified', 'rejected'));

alter table if exists public.bettor_account_activity_imports
  add column if not exists data_source text not null default 'parser_output' check (data_source in ('raw_upload', 'parser_output', 'demo_parse', 'bettor_verified')),
  add column if not exists parse_snapshot_json jsonb,
  add column if not exists verified_snapshot_json jsonb,
  add column if not exists last_reviewed_at timestamptz,
  add constraint bettor_account_activity_imports_verification_status_check check (verification_status in ('uploaded', 'parse_pending', 'parsed_demo', 'parsed_unverified', 'needs_review', 'verified', 'rejected'));

update public.bettor_artifacts
set verification_status = case
  when verification_status = 'verified' then 'verified'
  when parse_status = 'pending' then 'uploaded'
  when raw_parse_json ->> 'explicit_demo' = 'true' then 'parsed_demo'
  when confidence_score is not null and confidence_score < 0.55 then 'needs_review'
  else 'parsed_unverified'
end,
parser_confidence_label = case
  when confidence_score is null then 'unknown'
  when confidence_score >= 0.85 then 'high'
  when confidence_score >= 0.6 then 'medium'
  else 'low'
end,
data_source = case
  when verification_status = 'verified' then 'bettor_verified'
  when raw_parse_json ->> 'explicit_demo' = 'true' then 'demo_parse'
  when parse_status = 'pending' then 'raw_upload'
  else 'parser_output'
end;

update public.bettor_slips
set verification_status = case
  when verification_status = 'verified' then 'verified'
  when parse_snapshot_json ->> 'explicit_demo' = 'true' then 'needs_review'
  when confidence_score is not null and confidence_score < 0.55 then 'needs_review'
  else 'parsed_unverified'
end,
data_source = case
  when verification_status = 'verified' then 'bettor_verified'
  when parse_snapshot_json ->> 'explicit_demo' = 'true' or raw_source_reference = 'demo_parser' then 'demo_parse'
  else 'parser_output'
end,
parse_snapshot_json = coalesce(parse_snapshot_json, jsonb_build_object('migrated_from_foundation', true));

update public.bettor_slip_legs
set verification_status = case
  when verification_status = 'verified' then 'verified'
  when confidence_score is not null and confidence_score < 0.55 then 'needs_review'
  else 'parsed_unverified'
end,
data_source = case
  when verification_status = 'verified' then 'bettor_verified'
  else 'parser_output'
end,
parse_snapshot_json = coalesce(parse_snapshot_json, jsonb_build_object('migrated_from_foundation', true));

update public.bettor_account_activity_imports
set verification_status = case
  when verification_status = 'verified' then 'verified'
  when confidence_score is not null and confidence_score < 0.55 then 'needs_review'
  else 'parsed_unverified'
end,
data_source = case
  when verification_status = 'verified' then 'bettor_verified'
  else 'parser_output'
end,
parse_snapshot_json = coalesce(parse_snapshot_json, jsonb_build_object('migrated_from_foundation', true));
