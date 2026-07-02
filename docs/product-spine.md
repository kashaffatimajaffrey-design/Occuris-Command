# Occuris Command Product Spine

Occuris AI is the company. Occuris Command is the flagship product. SpecMatch is the sourcing and alternate-part engine inside the product.

The first product milestone is deliberately narrow:

1. A pilot user enters a tenant workspace.
2. They paste or upload a bill of materials.
3. The backend parses and persists BOM rows.
4. The system scores each component for initial sourcing risk.
5. The dashboard shows saved BOMs, risk scores, and recommended next actions.

## Current Implementation

- Frontend: React, Vite, TypeScript.
- Backend: FastAPI.
- Local pilot storage: SQLite in `backend/occuris_command.db`.
- Planned production storage: Supabase Postgres with tenant isolation, storage, and pgvector.
- AI proxy: `/api/chat` remains available, but agent intelligence should move behind tool-backed workflows.

## Near-Term Build Order

1. Replace local SQLite with Supabase schema and migrations.
2. Add Supabase Auth or Clerk for signup, login, email verification, and password reset.
3. Add tenant membership, roles, and audit log enforcement.
4. Add CSV/XLSX BOM upload.
5. Add document vault ingestion for datasheets, quotes, PCNs, PDNs, and compliance files.
6. Add pgvector retrieval with citations.
7. Add SpecMatch alternates using structured component specs plus retrieved datasheet evidence.
8. Add email notifications through Resend or Postmark.

## Product Rule

Every impressive feature must connect back to a concrete customer outcome:

Upload a BOM, find the risky parts, and get qualified next actions before production stops.
