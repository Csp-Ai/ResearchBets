# Architecture

This document tracks the high-level system architecture for ResearchBets.

## Current Principles

- Keep services modular and independently deployable.
- Enforce explicit API contracts via schema validation.
- Validate runtime configuration before startup.
- Maintain CI quality gates for linting, type safety, and documentation.
