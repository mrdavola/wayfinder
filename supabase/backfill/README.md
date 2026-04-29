# Backfill scripts (NOT migrations)

The `ALL_014_to_032_*.sql` files are one-shot catch-up scripts for environments
that missed the individual 014–032 migrations. They are kept here so the
migration runner does not auto-apply them.

- `ALL_014_to_032_combined.sql` — non-idempotent (bare `CREATE TABLE`/`POLICY`).
  Will fail mid-file on any DB that already has these objects. Use only on
  greenfield environments.
- `ALL_014_to_032_safe.sql` — idempotent variant with `IF NOT EXISTS` /
  `EXCEPTION` guards. Prefer this if you must run a catch-up.

Before running either, confirm the target DB's actual state:

```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

Then apply the individual numbered migrations for any rows that are absent.
