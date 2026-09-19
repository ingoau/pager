# pager

A small web app that lets people get my attention through PagerDuty — behind
passkey auth, with an admin panel for deciding who's allowed to use it.

## How access works

- Anyone can visit `/register`, give a name, an email and a reason, and register
  a passkey.
- **The first account ever registered becomes the admin** and is approved
  immediately. Every registration after that lands in a pending state and can't
  send anything until the admin approves it.
- An admin can also create a user directly from the admin panel and hand them a
  one-time login code instead.
- Approved users can send pages. Low priority is available to everyone; high
  priority is a per-user permission the admin grants.

There is no second class of account. However a user got in, they can add
passkeys from `/account`, redeem a login code, and link new devices. The last
remaining passkey can't be deleted.

## Signing in

Three ways, all landing on the same kind of session:

- **Passkey** — the primary method, and what `/login` offers first.
- **Login code** — at `/login/code`, linked from the sign-in page. The admin
  issues one from the admin panel and reads it out.
  Codes are 60 bits of randomness, stored only as a SHA-256 hash, valid for 15
  minutes, and single use. Issuing a new one invalidates the previous. This is
  how a new account gets in before it has a passkey, and how someone who lost
  their only device recovers.
- **Another device** — a signed-out device gets a code at `/link` and displays
  it; you approve that code from `/account` on a device you're already signed in
  on, and the waiting device gets a session as you. This is better-auth's
  device-authorization plugin (RFC 8628). It answers with a Bearer token rather
  than a cookie, so a small `after` hook turns the session it creates into a
  real session cookie. Approving asks for confirmation first, because a code
  someone else sends you is a way into your account, not a favour.

Sessions last 400 days and slide forward on use, which is as close to
indefinite as is achievable — the limit is the browser, not better-auth, since
Chrome clamps cookie lifetimes to 400 days.

> **Register immediately after deploying.** Since the first registration claims
> admin, anyone who finds the URL before you do would become the admin. The
> window closes as soon as you register.

## Routes

| Route         | Who                                                   |
| ------------- | ----------------------------------------------------- |
| `/`           | approved users — the page form                        |
| `/register`   | anyone — request access with a passkey                |
| `/login`      | anyone — sign in with a passkey                       |
| `/login/code` | anyone — sign in with a one-time code                 |
| `/link`       | anyone — get a code to sign in a new device           |
| `/pending`    | signed-in users awaiting or denied approval           |
| `/account`    | signed-in users — passkeys, sessions, device linking  |
| `/admin`      | admins — manage users and sessions, read the page log |

Guards live in `src/hooks.server.ts`, and every server action re-checks
permissions on its own rather than trusting the guard.

## Admin panel

`/admin` has two tabs:

- **users** — pending requests first, each showing the reason they gave.
  Create a user, approve, reject/revoke, grant or revoke high priority, issue a
  login code, or delete. Each user's active sessions are listed in their row and
  can be revoked individually. Rejecting also drops the user's live sessions so
  it takes effect straight away. Admins can't act on their own account, which
  prevents locking yourself out.
- **log** — every page that has been sent: who, when, title, priority, and
  whether PagerDuty actually accepted it. Entries survive the user being
  deleted.

## Setup

```sh
bun install
cp .env.example .env   # then fill it in
bun run db:migrate     # create the tables
bun run dev
```

`bun run db:migrate --dry` prints the SQL without applying it.

The schema comes from the better-auth config in
`src/lib/server/auth-options.ts`, which the app and the migration script share,
so the two can't drift. Re-run the migration after changing any field there.

## Upgrading an existing deployment

`bun run db:migrate` adds `status`, `role`, `allowHigh` and `reason` to the
existing `user` table. Rows that predate the migration get `NULL` for all of
them, and the guards fail closed — so **any account that already exists will be
locked out**, including yours, and no admin will exist to approve it.

The first-registration bootstrap won't help either, since the user table isn't
empty. Promote yourself directly once, right after migrating:

```sql
update "user"
set status = 'approved', role = 'admin', "allowHigh" = true
where email = 'you@example.com';
```

Anyone else already in the table stays pending until you approve them in the
admin panel.

## Environment

See `.env.example`. Two of them matter more than the rest:

- `PAGERDUTY_FROM` must be the login email of a real user in your PagerDuty
  account — the REST API rejects incident creation without it.
- `DATABASE_URL` should carry `?sslmode=verify-full` in production. When the
  connection string sets `sslmode`, `pg` handles TLS itself and the database
  certificate is properly verified. Without it, a remote database still gets
  TLS but the certificate is **not** checked, which is a workable default for
  managed providers with their own CAs and no defence against anyone who can
  intercept that connection.

## Building

```sh
bun run build
bun run preview
```

The project uses `@sveltejs/adapter-auto`; swap in a
[specific adapter](https://svelte.dev/docs/kit/adapters) for your host.
