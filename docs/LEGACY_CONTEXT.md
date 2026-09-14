# Legacy Context Registry

Legacy code is retained because it contains useful product exploration, copy, test cases, and interaction patterns. Retained does not mean active.

## Status vocabulary

- **Canonical:** allowed to define current product behavior.
- **Alternate:** supported capability that has not yet been folded into the canonical route.
- **Compatibility:** preserves old links while forwarding toward canonical behavior.
- **Internal:** operational or development surface outside the consumer journey.
- **Legacy reference:** historical implementation retained for study; canonical production modules must not import it.

## Legacy landing generations

The files listed under `legacyModules` in `config/convergence.json` are legacy references. They document earlier landing and cockpit experiments. They remain in the repository and may remain covered by historical tests, but new features and fixes must target `app/_components/CanonicalLanding.tsx` and `src/components/home/ResearchBetsHome.tsx`.

## Rules for legacy files

1. Do not delete legacy files merely to make the tree look clean.
2. Do not add new product behavior to a legacy reference.
3. Do not import a legacy reference from a canonical import root.
4. A useful legacy idea must be re-expressed through a canonical contract or component.
5. If a legacy file must temporarily serve production behavior, update the manifest with an owner, reason, and retirement condition first.

The convergence guard enforces the most important boundary automatically. Git history preserves chronology; this registry preserves intent.
