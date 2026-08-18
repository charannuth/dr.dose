# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| latest on `main` | :white_check_mark: |
| older releases   | :x:                |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by contacting the repository owner through GitHub (Security Advisories on the repository, if enabled) or via the contact method listed on the maintainer's GitHub profile.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected components (if known)

We will acknowledge receipt and work on a fix before any public disclosure when possible.

## Sensitive data

This application handles health-related information with **client-side (zero-access) encryption**:
medication names, doses, notes, and related PHI are encrypted on-device before sync. The data
encryption key is wrapped with the user's login password (and a recovery “account backup”).
Operators with database access should see ciphertext only for those fields after users migrate.

Never commit secrets, API keys, `.env` files, vault passphrases, recovery phrases, or real
patient data to the repository.

### Database migrations for E2EE

- `supabase/migrations/026_user_crypto.sql` — required (`user_crypto` vault metadata)
- `supabase/migrations/027_e2ee_column_types.sql` — full text columns for ciphertext (coordinate with App Store cutover)
- `supabase/migrations/028_rollback_027_for_live_app.sql` — emergency rollback if 027 ships while older clients are still live

Current production should have **026** and the post-**028** column types until the E2EE client is on the App Store. The client encrypts `text[]` PHI as a single-element ciphertext array so it works before 027 is re-applied.
