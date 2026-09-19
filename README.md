# pager

A small web app that lets people get my attention through PagerDuty — behind
passkey auth, with an admin panel for deciding who's allowed to use it.

## How access works

- Anyone can visit `/register`, give a name, an email and a reason, and register
  a passkey.
- **The first account ever registered becomes the admin** and is approved
  immediately. Every registration after that lands in a pending state and can't
  send anything until the admin approves it.
- Approved users can send pages. Low priority is available to everyone; high
  priority is a per-user permission the admin grants.
- Users can register several passkeys (one per device) from `/account`, so
  losing a device doesn't lock them out. The last remaining passkey can't be
  deleted.

> **Register immediately after deploying.** Since the first registration claims
> admin, anyone who finds the URL before you do would become the admin. The
> window closes as soon as you register.

## Routes

| Route       | Who                                         |
| ----------- | ------------------------------------------- |
| `/`         | approved users — the page form              |
| `/register` | anyone — request access                     |
| `/login`    | anyone — sign in with a passkey             |
| `/pending`  | signed-in users awaiting or denied approval |
| `/account`  | signed-in users — manage passkeys           |
| `/admin`    | admins — manage users, read the page log    |

Guards live in `src/hooks.server.ts`, and every server action re-checks
permissions on its own rather than trusting the guard.

## Admin panel

`/admin` has two tabs:

- **users** — pending requests first, each showing the reason they gave.
  Approve, reject/revoke, grant or revoke high priority, or delete. Rejecting
  also drops the user's live sessions so it takes effect straight away. Admins
  can't act on their own account, which prevents locking yourself out.
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

See `.env.example`. `PAGERDUTY_FROM` in particular must be the login email of a
real user in your PagerDuty account — the REST API rejects incident creation
without it.

## Building

```sh
bun run build
bun run preview
```

The project uses `@sveltejs/adapter-auto`; swap in a
[specific adapter](https://svelte.dev/docs/kit/adapters) for your host.
