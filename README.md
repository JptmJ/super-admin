# RatnaGrid — Platform Admin

The super admin console. Creates tenants, their head user (Admin), branches and
module licences. Nobody but a platform operator can sign in here.

```bash
npm install
npm run dev        # http://localhost:4100
```

Needs the backend running on `:4000` (set `BACKEND_URL` in `.env.local` to point
elsewhere).

## First sign-in

Create the first operator from the backend — only a super admin can create a
super admin, so the very first one is made on the command line:

```bash
cd ../karat-setu-erp-backend
npm run seed:superadmin -- --password='...'
```

Defaults to `s.admin@ratnagrid.com`; pass `--email=` to change it. Running it
again resets the password, which is the recovery path if it is lost. There is
**one** super admin — no endpoint creates another.

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

## Pages

| Route | What it does |
|---|---|
| `/login` | Sign in. |
| `/` | Platform counts and the most recent tenants. |
| `/tenants` | Every tenant, with filters. |
| `/tenants/new` | Create a tenant + its Admin + first branch + licences, in one form. |
| `/tenants/[id]` | Staff, branches, module licences and account status. |
| `/audit` | Every super-admin action. |

## The rules this panel enforces

**You are the only one who manages users.** Nobody inside a jewellery business
can add, promote or deactivate anyone — a branch admin can see their staff list
and nothing more.

**A branch has exactly one admin.** Either every branch has its own, or one
admin covers all of them; both shapes work and can be mixed. The Add-staff form
only offers branches that still need an admin, and the database refuses a second
one regardless.

Four fixed roles: **Branch Admin**, **Sales Executive**, **Accountant**,
**Store Keeper**.
