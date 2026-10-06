# Swarnay — Platform Admin

The super admin console. Creates tenants, their head user, branches and module
licences, sets feature flags, and opens support sessions into a business.
Nobody but a platform operator can sign in here.

```bash
npm install
npm run dev        # http://localhost:4100
```

Needs the backend running on `:4000` (set `BACKEND_URL` in `.env.local` to point
elsewhere). `NEXT_PUBLIC_APP_URL` is where the tenant app is served — the
Support tab builds its "open the shop" link from it.

## First sign-in

Create the first operator from the backend — the API has no endpoint that
creates one, so it is made on the command line:

```bash
cd ../karatsetu-backend
npm run seed:superadmin -- --password='...'
```

Defaults to `s.admin@swarnay.com`; pass `--email=` to change it. Running it
again resets the password, which is the recovery path if it is lost.

## Roles

**One operator — you — holding everything.** There is a single platform role,
`super_admin`, with `*`. No tiers, no second operator, and no endpoint that
creates one.

A platform token is refused by every tenant endpoint and a tenant token by every
platform endpoint, so the only way from this console into a business's data is a
support session — which is logged.

### Inside a jewellery business

Three kinds, in `karatsetu-backend/src/modules/platform/roles.ts`:

| Kind | What it is |
|---|---|
| **Owner** | The proprietor. Everything, every branch. Seeded with the business. |
| **Branch Admin** | Runs a branch, including the shop's own branch list and switching a staff account off. Seeded with the business. |
| **Staff** | Everyone else — **named and given permissions per business**, from that tenant's Roles tab. |

Owner and Branch Admin are fixed: narrowing an owner would lock a shop out of
its own books, and an admin that cannot run a branch is not an admin.

**Staff roles are the point.** One shop's "Accountant" handles billing; another's
handles billing and tagging. Rather than guess a ladder, you name the role as
that shop thinks of it and tick exactly what it reaches — module, area within
it, or single actions. The picker is generated from the live routes, so a tick
always grants something real and the screen cannot drift from the API.

Ticking a whole module grants its wildcard (`pos.*`) rather than every leaf, so
a role given "all of Billing" still means that when billing endpoints are added.

### What a business may do about its own people

Almost nothing, and deliberately. The endpoints are gone rather than
permission-gated: no `POST /api/settings/users`, no role editor, no password
reset. A shop sees its staff list and can **switch an account off** — the one
exception, so somebody leaving at short notice does not wait on us. The owner's
account and one's own are refused.

Everything else is here: add staff, edit name and contact, move branch, change
role, activate, deactivate, issue a temporary password, and define the roles
themselves.

**A branch has exactly one admin.** Either every branch has its own, or one
admin covers all of them; both shapes work and can be mixed. Moving someone into
a branch that already has an admin is refused, naming whoever holds the slot.

## Branches and the branch limit

A branch is created the same way wherever it comes from — this console or the
shop's own Masters → Shops & Branches — through one service, so it always
arrives with the stock locations its kind needs. (They used to differ: a branch
added from inside the shop got no locations at all, and its first sale would
have failed.)

**Branch limit** is set per tenant, on the create form and under Settings. Blank
means no limit, which is where every business starts. It is checked on both
paths, so a shop whose admin may add branches cannot add thirty, and it counts
deactivated branches too — otherwise a branch could be parked to reclaim a slot.

## Pages

| Route | What it does |
|---|---|
| `/login` | Sign in. |
| `/` | Platform counts and the most recent tenants. |
| `/tenants` | Every tenant, with filters. |
| `/tenants/new` | Create a tenant + its admin + first branch + licences, in one form. |
| `/tenants/[id]` | Staff, **roles**, branches, module licences, support sessions and account status. |
| `/support` | Every support session, open and past, with what each one changed. |
| `/flags` | Feature flags: the global default and any per-tenant override. |
| `/roles` | The role kinds and everything a staff role can be given, read-only. Build them per tenant. |
| `/audit` | Every super-admin action, filterable by business and action. |

## Support sessions

The only path to a business's data. A session is opened from a tenant's Support
tab with a reason, a duration and — for the Super Admin only — write access.

- The token is returned **once** and stored only as a SHA-256 hash.
- The session row is checked on **every** request, so ending a session locks the
  operator out at once rather than whenever the token would have expired.
- Read-only is the default, and it refuses anything that is not a GET.
- Every change made inside the window is tagged with the session in the
  **tenant's own** audit log, so "who looked at my data" is answerable with
  exactly what and when.
- The tenant app shows an undismissable banner naming the operator, the time
  remaining and whether the session can write.

The "open the shop" link passes the token in the URL fragment, which browsers do
not send to a server or put in a `Referer` header; the app adopts it and strips
it from the address bar on arrival.

## How auth works here

The platform token is kept in an **httpOnly cookie** and never reaches client
JavaScript. The browser calls this app's own `/api/proxy/*` routes, which attach
the token server-side and forward to the backend. Two consequences worth knowing:

- An XSS bug in this panel cannot steal the token.
- The proxy only forwards to `/api/platform/*`. Without that restriction this
  panel would be a general-purpose way to call any backend endpoint as a super
  admin, which is not what it is for.

A 401 triggers one transparent refresh and retry, so a 15-minute access token
does not interrupt someone mid-form.

## Not here yet

Deliberately deferred, not forgotten:

- **Platform billing** — plans, tenant invoices, collection.
- **2FA** for the Super Admin.
- **Support tickets** and **tenant health dashboards**.
