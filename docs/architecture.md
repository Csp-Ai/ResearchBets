# ResearchBets V2 Architecture Notes

- App Router pages orchestrate feature modules and remain thin.
- `entities/` owns domain schemas and type contracts with Zod validation.
- `features/` groups UX and state logic by product vertical.
- `services/` contains external provider clients and integration boundaries.
- `lib/` contains cross-cutting runtime concerns (config, session identity).
