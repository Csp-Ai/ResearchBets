alter table if exists public.bettor_artifacts
  add column if not exists parser_adapter text,
  add column if not exists normalized_parse_json jsonb,
  add column if not exists parser_warnings_json jsonb not null default '[]'::jsonb,
  add column if not exists parser_errors_json jsonb not null default '[]'::jsonb,
  add column if not exists parser_provenance_json jsonb;

update public.bettor_artifacts
set parser_adapter = coalesce(parser_adapter, case
    when raw_parse_json ->> 'source' = 'demo_parser' then 'demo_parser'
    else null
  end),
  normalized_parse_json = coalesce(normalized_parse_json, raw_parse_json),
  parser_warnings_json = coalesce(parser_warnings_json, '[]'::jsonb),
  parser_errors_json = coalesce(parser_errors_json, '[]'::jsonb),
  parser_provenance_json = coalesce(parser_provenance_json, jsonb_build_object(
    'migrated_from_review_foundation', true,
    'source_sportsbook_hint', source_sportsbook,
    'recognized_sportsbook', source_sportsbook,
    'recommended_next_state', case
      when verification_status = 'verified' then 'parsed_unverified'
      when verification_status in ('needs_review', 'rejected', 'parsed_demo') then 'needs_review'
      else 'parse_failed'
    end
  ))
where parser_adapter is null
   or normalized_parse_json is null
   or parser_provenance_json is null;
