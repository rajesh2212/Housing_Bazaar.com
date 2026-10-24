# Housing Baazar

An Odisha rental listings site with a database-backed property catalogue, secure accounts, private household profiles, and an administrator portal for members and homes. The public experience keeps the browse, search, filter, property-detail, visit-request, and contact flows, now backed by the same data the admin edits.

The starting collection covers Bhubaneswar, Cuttack, Puri, Rourkela, Sambalpur, Berhampur, and Balasore. Those eight seed homes are demo content for development, not verified or live inventory.

## Quick start

You need Node.js **22.5 or newer** (the app uses the built-in `node:sqlite` module) and npm.

```bash
git clone https://github.com/rajesh2212/Housing_Bazaar.com.git
cd Housing_Bazaar.com
npm install
cp .env.example .env
npm start
```

Then open `http://localhost:3100`.

On first start the server creates the SQLite database at `data/housing-baazar.sqlite` and seeds the eight demo homes. On Windows PowerShell, copy the environment file with `Copy-Item .env.example .env` and stop the server with `Ctrl+C`.

To sign in as an administrator: register your account at `http://localhost:3100/register.html`, then run `npm run promote-admin -- you@example.com`, sign out, and sign in again. Full instructions are in [Run locally](#run-locally) and [First administrator](#first-administrator).

## Stack

- HTML, CSS, and vanilla JavaScript for the public, account, and admin screens.
- Node.js **22.5 or newer** and Express 5 for page delivery, page guards, and the JSON API.
- SQLite through the built-in `node:sqlite` module, with WAL mode and foreign keys enabled.
- `scrypt` password hashing and opaque session/reset tokens from `node:crypto`.
- `sharp` for validating, re-encoding, and resizing profile and property photos.
- `nodemailer` for password-reset email delivery.

## Architecture

```
Browser
  ├── HTML pages + style.css + appearance.css + admin.css
  ├── scripts.js                 public listings, filters, hero, contact/visit UI
  ├── js/auth-client.js          session state, account header, CSRF token
  ├── js/auth-pages.js           login, registration, forgot/reset password
  ├── js/account.js              profile editing and photo upload
  ├── js/admin.js                member directory and property management
  ├── js/appearance-boot.js      applies saved theme/glass before paint
  └── js/appearance.js           settings popover, glass slider, Day/AMOLED
          │
          ▼
Express (server/app.js)
  ├── security headers + CSP
  ├── allowlisted pages, /style.css, /appearance.css, /admin.css,
  │   /scripts.js, /favicon.svg, /images, /js
  ├── page guards for /account.html and /admin.html
  ├── same-origin checks for /api mutations
  └── /api router (server/routes.js)
          ├── SQLite        data/housing-baazar.sqlite
          ├── uploads       storage/properties/*.webp (public media)
          │                 storage/avatars/*.webp (private, authorized API)
          └── SMTP          password-reset email
```

The server serves the active pages from the repository root. `legacy/` is an untouched archive from the original project and is not used by the running site. `housing-baazar-launch/` is an unrelated launch-film workspace; it is not part of the running app and is not served.

## Requirements

- Node.js **22.5 or newer** (`node:sqlite` is required).
- npm.
- Writable directories for the SQLite database and uploads.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3100`.

On first initialization, server startup creates the schema, enables WAL, and seeds the eight demo homes. An existing catalogue is never overwritten or reseeded. `npm run db:init` performs the same idempotent setup explicitly. `npm run dev` restarts the server when server-side files change. `.env` is loaded automatically and is never served.

On Windows PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env
```

## First administrator

No administrator account is seeded, and public registration can never create one. The insert statement hardcodes the `user` role and ignores any submitted role value.

1. Register the owner account through `register.html`.
2. Promote it from the machine that owns the database:

   ```bash
   npm run promote-admin -- owner@example.com
   ```

3. Sign out and sign in again, then open `admin.html`.

The command only updates an existing account and prints an error when the email is not registered or invalid. No credentials are stored in the repository, and the promotion path is not reachable from browser JavaScript.

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env` or real credentials.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Use `production` on a public deployment. Enables production cookie defaults, HSTS, and CSP upgrade rules. |
| `PORT` | `3100` | HTTP port. |
| `HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` only when the process is meant to accept external connections directly. |
| `APP_ORIGIN` | `http://localhost:3100` | Absolute public origin, without a trailing slash. Used in reset links and origin checks. It must match the URL people use in the browser. |
| `TRUST_PROXY` | `false` | Set to `true` only behind one trusted reverse proxy, so `req.ip` and protocol detection are correct. |
| `DATABASE_PATH` | `data/housing-baazar.sqlite` | SQLite file, resolved from the project root. |
| `STORAGE_DIR` | `storage` | Private upload directory, resolved from the project root. |
| `SESSION_TTL_DAYS` | `7` | Session lifetime in days (minimum 1). |
| `RESET_TTL_MINUTES` | `60` | Password-reset link lifetime in minutes (minimum 5). |
| `DEV_SHOW_RESET_LINK` | `false` (example file: `true`) | Development only. Shows the reset link in the browser and logs it. Must be `false` or absent in production. |
| `COOKIE_SECURE` | `true` in production, `false` in development | Forces the `Secure` cookie flag when set. Leave unset in development on plain HTTP. |
| `SMTP_HOST` | empty | SMTP hostname. Setting this together with `MAIL_FROM` enables email delivery. |
| `SMTP_PORT` | `587` | SMTP port. |
| `SMTP_SECURE` | `true` when port is `465` | Use implicit TLS; otherwise STARTTLS is used with TLS 1.2 or newer. |
| `SMTP_USER` | empty | SMTP username, when the provider requires one. |
| `SMTP_PASS` | empty | SMTP password or provider API key. Keep out of source control. |
| `MAIL_FROM` | empty | Verified sender address, for example `"Housing Baazar <no-reply@yourdomain>"`. Required to enable email. |
| `MAIL_REPLY_TO` | empty | Optional reply-to address. |

Password reset email delivery requires both `SMTP_HOST` and `MAIL_FROM`; the username and password are optional for providers that authenticate by IP or relay.

## Password-reset delivery

### Development, no SMTP configured

With `DEV_SHOW_RESET_LINK=true` and `NODE_ENV` not `production`:

- A request for a registered address creates a single-use token and returns a generic confirmation.
- The page shows a clearly marked development panel with the link, and the server logs the link. No email is sent, and the interface says the link was prepared rather than claiming delivery.
- A request for an unregistered address returns the same generic confirmation without a token or panel.

This panel intentionally reveals whether an address is registered. It is a local development aid only. Never enable `DEV_SHOW_RESET_LINK` on a shared or public host.

### SMTP configured

- The backend sends a reset email with the same generic response for known and unknown addresses.
- If the provider rejects the send, the request returns `503` with a user-safe message instead of pretending the email was sent. The token is not consumed by a failed send.
- The page reports that failure honestly.

### Development or production without SMTP

If no SMTP transport is configured and the development link flow is unavailable, reset requests return `503` with a message to contact support. Configure SMTP before launch.

### SMTP provider setup

1. Create an account with an SMTP provider (for example Postmark, Resend, Amazon SES, Mailgun, or a Google Workspace mailbox).
2. Verify the sending domain and the `MAIL_FROM` address with the provider.
3. Create SMTP credentials for this application.
4. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and optionally `MAIL_REPLY_TO` in `.env`.
5. Restart the server. Startup reports whether email delivery is configured and warns if transport verification fails.
6. Test the forgot-password flow with an account you control.

Typical values (replace every placeholder):

```dotenv
SMTP_HOST=smtp.provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="Housing Baazar <no-reply@yourdomain.example>"
MAIL_REPLY_TO=support@yourdomain.example
```

### Reset tokens

- 32 random bytes, base64url encoded.
- Only a SHA-256 hash is stored in `password_resets`; the raw token exists only in the link and the email.
- Expire after `RESET_TTL_MINUTES` (60 by default).
- Single use. A successful reset marks the token used and revokes every session for that account.
- Requesting another reset invalidates the previous unused token for that account.
- The reset endpoint responds with a generic message for invalid, expired, or already-used links.

## Database and migrations

Schema is defined in `server/db.js` and created idempotently by `npm run db:init` or server startup. The current schema version is **2** (`PRAGMA user_version`). Version 2 adds the `properties` table.

When the database is older than version 2, startup calls `seedProperties()`. It inserts the eight Odisha demo homes only if the `properties` table is empty, then sets `user_version = 2`. An existing catalogue is never overwritten. There is no separate migration runner; when changing the schema, back up the database, add an explicit migration before bumping `SCHEMA_VERSION`, and verify it against a copy before deploying.

### Tables

`users`

- `id` (UUID, primary key)
- `email` (unique, case-insensitive)
- `password_hash` (scrypt string)
- `role` (`user` or `admin`, default `user`)
- `full_name`
- `household_members` (1–20, default 1)
- `bhk_preference` (`1`, `2`, `3`, `4`, `5+`, default `2`)
- `photo_path` (private filename or null)
- `created_at`, `updated_at` (Unix milliseconds)

`sessions`

- `token_hash` (SHA-256 of the cookie token, primary key)
- `user_id` (foreign key, cascades on user deletion)
- `csrf_token`
- `created_at`, `expires_at`

`password_resets`

- `token_hash` (SHA-256, primary key)
- `user_id` (foreign key, cascades)
- `created_at`, `expires_at`, `used_at`

`properties`

- `id` (integer, primary key)
- `title`, `city`, `locality`
- `price` (monthly rent, INR), `deposit`
- `bedrooms`, `bathrooms`, `area_sqft`
- `property_type` (`Apartment`, `Villa`, `Townhouse`, `Studio`)
- `furnishing` (`Fully furnished`, `Semi-furnished`, `Unfurnished`)
- `available_from` (`Immediately` or `YYYY-MM-DD`)
- `description`, `neighbourhood`
- `amenities` and `tags` (JSON arrays)
- `cover_image`, `gallery` (JSON array of image URLs)
- `status` (`active` or `archived`), `featured` (0 or 1)
- `created_at`, `updated_at`

`inquiries`

- `id`, `kind` (`contact` or `visit`), `name`, `email`, `phone`, `interest`, `message`, `property_id`, `visit_date`, `created_at`

Inquiries are validated and stored privately. There is currently no inquiry screen in the admin portal; query the database directly for follow-up.

### Backup and persistence

`data/` and `storage/` are ignored by git and must be backed up together. Stop the server before copying a SQLite file, or use SQLite's online backup tooling so the WAL files remain consistent. Do not commit the database, uploads, `.env`, or logging output.

## Property management

Administrators manage the catalogue from `admin.html` → **Homes**. Changes are saved to SQLite and appear on the public site immediately.

- **Add a home:** opens a dialog with title, city, locality, monthly rent, deposit, bedrooms, bathrooms, area, type, furnishing, availability, description, neighbourhood, amenities, tags, and a featured flag.
- **Edit:** the same dialog pre-filled from the database. Server-side validation mirrors the browser checks and returns field-level errors.
- **Archive:** removes a home from the public homepage, featured card and hero, search results and counts, similar homes, and its detail page. The record and photos are kept. Archived homes are visible only through the admin **Archived** filter and can be restored.
- **Delete:** requires a separate confirmation and permanently removes the property record and property images stored under `/media/properties`. Seed images under `/images` are not touched.
- **Cover and gallery:** upload or replace a cover, remove the cover, add up to six images per request, or remove gallery images. A gallery is capped at 12 images. Removing a gallery image also removes its stored file unless that file is still the cover. Every destructive image action asks for confirmation.

Field rules include an Odisha-city allowlist, rent from ₹1,000 to ₹1,00,00,000, deposit from ₹0 to ₹10,00,00,000, 1–20 bedrooms and bathrooms, 100–1,00,000 sq ft, a 5–120 character title, a 20–4,000 character description, a 10–500 character neighbourhood, at least one amenity, and up to eight tags. Emails, passwords, and roles are not property fields.

### Property images and upload storage

- Accepted types: JPEG, PNG, or WebP, up to **8 MB** per image.
- At least 320 × 240 pixels and at most 40 megapixels; animated images are rejected.
- Images are auto-oriented, resized to fit within 1600 × 1600 without enlargement, and re-encoded as WebP at quality 82. Metadata is stripped.
- Filenames are server-generated UUIDs; original names are not used.
- Uploaded files live in `storage/properties/` and are served from `/media/properties/<uuid>.webp` with a seven-day immutable cache. `storage/` and `data/` are gitignored.
- A property without a cover shows `images/property-placeholder.svg`.
- The eight bundled demo photos also have 900 px card variants (`propertyN-card.webp`) used by public listing cards. The full-size JPEG remains the property-detail cover, so cards stay sharp at retina card widths without shipping 1600 px files for every thumbnail.
- Hero cutouts and the auth background are WebP; the source PNG/JPEG files stay in `images/` for traceability but are not requested by the site.

Cover uploads accept one multipart field named `image`; gallery uploads accept up to six files named `images`.

### Public consistency

Public pages load homes from `GET /api/properties`, which returns only `active` records. The same serialized shape drives homepage featured cards, hero statistics and featured card, search and filter results, neighbourhood links, property details, similar homes, and count labels. Property details for archived or missing records return `404` with an honest unavailable message. Empty, loading, and server-error states are handled in the interface rather than showing stale or placeholder inventory.

## Renter administration

Administrators can open the **Members** view in `admin.html` to browse registered users. The table shows full name, email, household size, BHK preference, profile photo (or initials), and join/update dates. It supports a name/email search, an all-BHK filter, and 12 members per page with an empty state when nothing matches.

The server checks the administrator role on both the page request and every admin API response. Ordinary signed-in users receive `403` even when they call an admin endpoint directly. Admin responses include public profile fields only; password hashes, reset tokens, and session tokens are never returned.

## Accounts and security

- **Registration:** public registrations always receive the `user` role. Submitted role values are ignored.
- **Passwords:** scrypt (`N=16384`, `r=8`, `p=1`, 64-byte key, random 16-byte salt). No plaintext password is stored or logged.
- **Sessions:** 32-byte opaque tokens; only SHA-256 hashes are stored. The browser holds an `HttpOnly`, `SameSite=Lax` cookie (`hb_session`), with `Secure` enabled in production. Sessions expire and are refreshed on sign-in.
- **CSRF:** authenticated mutations require the per-session `X-CSRF-Token` header. Cross-origin mutations are also rejected using `Origin` and `Sec-Fetch-Site` checks.
- **Authorization:** every protected page and API route checks the session on the server. Admin API routes require `role = 'admin'` from the database, not a URL, form field, or client flag.
- **Private data:** profile data is returned only to the owning session or an administrator. Photos are served through `/api/users/:id/photo` after an owner/admin check, with `private, no-store` caching. Admin responses omit password hashes, reset tokens, and session tokens.
- **Profile photos:** maximum 5 MB; JPEG, PNG, or WebP only; at least 32 × 32; at most 24 megapixels; animated images rejected. Files are re-encoded to a 512 × 512 WebP with a server-generated filename and removed on replacement or deletion.
- **Limits:** in-memory limits cover login (12 per 15 minutes), registration (5 per 15 minutes), forgot-password (5 per 15 minutes), reset verification (40 per 15 minutes), password reset (10 per 15 minutes), avatar uploads (30 per hour), property uploads (80 per hour), and inquiries (8 per 10 minutes). Verification and origin checks run before handlers.
- **Headers:** CSP with no inline scripts, `nosniff`, frame denial, referrer policy, permissions policy, and HSTS in production.
- **Enumeration:** login failures and reset requests use generic messages. Development reset-link display is the only deliberate exception and is disabled in production.
- **Email:** reset responses never claim delivery when SMTP failed, and unregistered/registered addresses receive the same wording.

Rate-limit state is in memory and resets when the process restarts. A multi-instance deployment should use a shared limiter.

## Appearance settings

Every active page includes an appearance trigger: a vertical three-dot button beside **Home** in the main header. It has the accessible name “Appearance settings”, is keyboard operable, and opens a glass settings panel on desktop and mobile.

- **Glass level:** a 0–100 slider controls blur, translucency, border highlight, and surface effects site-wide. At 0 the effect is absent or minimal; at 100 it is strong while preserving readable contrast and visible focus. The settings panel itself keeps a glass treatment.
- **Day mode:** restores the pastel lilac, blush, and near-white theme.
- **AMOLED mode:** switches to a deep-black theme with true `#000000` page backgrounds, adjusted cards, borders, forms, nav, and admin tables, and brighter lilac accents. It does not claim to disable pixels, detect an OLED panel, or request device permissions.
- **Persistence:** preferences are saved in `localStorage` as `hb.glass` and `hb.theme` and applied by `js/appearance-boot.js` before first paint. This storage is UI-only; it is never used for account or authorization state.
- **Accessibility:** selected Day/AMOLED pills expose `aria-pressed`; the layout respects `prefers-reduced-transparency` with a solid fallback, `prefers-reduced-motion`, and `prefers-contrast`. Glass never hides focus outlines or replaces boundary contrast.

## Pages and access

| Page | Access |
| --- | --- |
| `index.html`, `listings.html`, `property.html`, `contact.html` | Public |
| `login.html`, `register.html`, `forgot-password.html`, `reset-password.html` | Public |
| `account.html` | Signed-in users; anonymous visitors are redirected to `login.html?next=%2Faccount.html` |
| `admin.html` | Administrators only; anonymous visitors are redirected to sign in, signed-in non-admins receive the 403 page |
| `403.html`, `404.html` | Public error pages |

All active pages share the header account slot and appearance trigger. Signed-in users see a photo or initials with an accessible label such as “Your account, Full Name”.

## API

All responses are JSON under `/api`. Mutating routes marked CSRF require the `X-CSRF-Token` value returned by `GET /api/auth/session`. Public form posts still pass the same-origin request check.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Liveness check. |
| `GET` | `/api/properties` | Public | All active properties with public metadata. |
| `GET` | `/api/properties/:id` | Public | One active property; archived or missing records return `404`. |
| `GET` | `/api/auth/session` | Public | Current user and CSRF token, or `{ user: null }`. |
| `POST` | `/api/auth/register` | Public, rate-limited | Create an ordinary user and start a session. |
| `POST` | `/api/auth/login` | Public, rate-limited | Sign in with a generic failure message. |
| `POST` | `/api/auth/logout` | Session + CSRF | Destroy the current session. |
| `POST` | `/api/auth/password/forgot` | Public, rate-limited | Request a reset link with a generic response. |
| `GET` | `/api/auth/password/reset/verify?token=…` | Public, rate-limited | Report whether a reset token is currently usable. |
| `POST` | `/api/auth/password/reset` | Public, rate-limited | Consume a token, change the password, and revoke sessions. |
| `GET` | `/api/profile` | Session | Read the current profile. |
| `PATCH` | `/api/profile` | Session + CSRF | Update full name, household members, and BHK preference. Email and role are not accepted. |
| `POST` | `/api/profile/photo` | Session + CSRF, multipart `photo` | Validate, resize, store, and attach a profile photo. |
| `DELETE` | `/api/profile/photo` | Session + CSRF | Remove the current photo. |
| `GET` | `/api/users/:id/photo` | Owner or admin | Serve the private photo with no-store caching. |
| `GET` | `/api/admin/users?q=&bhk=&page=` | Admin | Paged, searchable member directory; 12 per page. |
| `GET` | `/api/admin/properties?q=&status=&type=&page=` | Admin | Paged property catalogue; 10 per page. |
| `POST` | `/api/admin/properties` | Admin + CSRF | Create a property. |
| `PATCH` | `/api/admin/properties/:id` | Admin + CSRF | Edit property fields. |
| `POST` | `/api/admin/properties/:id/archive` | Admin + CSRF | Hide a property from renters. |
| `POST` | `/api/admin/properties/:id/restore` | Admin + CSRF | Return an archived property to the public catalogue. |
| `DELETE` | `/api/admin/properties/:id` | Admin + CSRF | Delete a property and its uploaded images. |
| `POST` | `/api/admin/properties/:id/cover` | Admin + CSRF, multipart `image` | Upload or replace the cover photo. |
| `DELETE` | `/api/admin/properties/:id/cover` | Admin + CSRF | Remove the cover photo. |
| `POST` | `/api/admin/properties/:id/gallery` | Admin + CSRF, multipart `images` | Add up to six gallery photos. |
| `DELETE` | `/api/admin/properties/:id/gallery` | Admin + CSRF, JSON `{ image }` | Remove a gallery photo. |
| `POST` | `/api/inquiries` | Public, rate-limited | Store a contact message or visit request. |

## Frontend notes

- `scripts.js` loads active properties from the API, owns listing search/filter/sort and URL state, homepage featured cards and statistics, the property view, visit requests, the FAQ animation, and the mobile navigation sheet. It no longer contains a hardcoded listing array.
- `js/auth-client.js` loads the session, updates the header account slot on every page, exposes the CSRF token, and hides admin navigation for non-admins. Hiding navigation is cosmetic; the server checks authorization separately.
- `js/auth-pages.js` handles client-side field validation, safe `next` redirects after login, reset-token verification, and honest success/error states.
- `js/account.js` manages profile saves, local photo preview, upload progress, replacement, and removal.
- `js/admin.js` manages both tabs: member search/filter/pagination and property search/filter, create/edit dialogs, archived/active views, image uploads, confirmations, and loading/empty/error states.
- `js/appearance.js` manages the glass slider, theme pills, persistence, and accessibility state.
- Listing cards derive their 900 px WebP thumbnail from bundled demo photo paths; admin-uploaded covers (already processed to WebP) are served as-is. The hero alternate photo is prepared on pointer/focus intent, so it costs nothing for visitors who never use the toggle.
- The interface is responsive, uses visible focus styles, semantic headings and labels, `aria-live` status messages, and honors `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast`.

## Design system and motion

`style.css` defines one token layer at `:root`: a soft pastel palette of hazy lilac and blush with near-white lavender surfaces, dark plum type, and periwinkle accents, plus shared type, spacing, border, radius, shadow, gradient, and motion values. Accent text uses the darker `--accent-text` token so it meets contrast requirements on pale surfaces. `:root[data-theme="amoled"]` swaps in true black with brighter lilac accents. Components and tokens are reused across public, auth, account, admin, and error pages.

Motion is deliberately sparse: spring-like entrances on page content and cards, scroll-triggered reveals through `IntersectionObserver`, and a small requestAnimationFrame parallax on the hero atmosphere and stage shapes. Every transform and transition is disabled or simplified under `prefers-reduced-motion`. There are no external motion libraries.

## Performance and delivery

- `server/compress.js` is a dependency-free text compressor built on `node:zlib`. It negotiates Brotli (preferred) or gzip from `Accept-Encoding` with q-value handling, compresses HTML, CSS, JavaScript, JSON, XML, and SVG responses of at least 1 KB, and skips `HEAD`, `204`, `206`, and `304`. Compressed responses send `Vary: Accept-Encoding`, a correct `Content-Length`, and a weak ETag so revalidation still returns cheap `304`s.
- Measured on the running build: `style.css` 84,782 B → 13,536 B (84% smaller), `scripts.js` 52,945 B → 12,177 B, the homepage document 16,452 B → 3,570 B, and `/api/properties` 8,466 B → 2,311 B (73% smaller).
- HTML, CSS, and JavaScript are served `no-cache` and revalidate with ETags; `/images` caches for one day and `/media/properties` for seven days as immutable. Public API responses stay `no-store`, and signed-in pages stay `no-store`.
- Images use `loading="lazy"` and `decoding="async"` below the fold, explicit `width`/`height` to reserve space, and format/size variants as described above. The hero is preloaded with `imagesrcset`/`imagesizes` and `fetchpriority="high"`.
- Every page declares `<meta name="theme-color">`; `js/appearance.js` updates it to black when AMOLED is selected. `robots.txt` allows public pages and excludes the account, admin, and API routes.
- Security headers, CSP, page guards, origin checks, and the existing cache policy are unchanged. Compression adds no runtime dependencies and no build step.

## Hero image and control

- Featured state: `images/hero-house-cutout.webp` (1108 × 831), a background-free cutout of the charcoal modern villa from `images/hero-house-source-villa.jpg`.
- **4BHK · Private pool** state: `images/hero-house-cottage-cutout.webp` (1108 × 812), a background-free cutout of the white cottage from `images/hero-house-source-cottage.jpg`.
- Both cutouts were inspected at full resolution for intact rooflines, windows, edges, and landscaping, with no white rectangle or leftover display platform.
- The cutouts are encoded as lossless WebP. The alpha channel is pixel-identical to the PNG originals; only color values under fully transparent pixels differ, which cannot be rendered. The PNG originals remain in `images/` as source art and are not requested by the page.
- Each cutout ships as a 400w / 640w / 800w / 1108w WebP ladder. Markup uses `srcset` and `sizes`, and the homepage preloads the ladder so the correct variant is fetched once for the visitor's viewport and pixel density.
- The source JPEGs are kept in `images/` for traceability; the running page never loads them.
- The hero house is rendered at least 30% larger than the previous desktop treatment, with responsive scaling and repositioning on narrow screens. Headline, search controls, and CTAs remain readable and clickable.
- The clickable hero control labelled **4BHK · Private pool** swaps only the hero image between the two cutouts, updating its source, srcset, alt text, intrinsic dimensions, title, and `aria-pressed` state. The alternate cutout is prepared on pointer/focus intent rather than preloaded for every visitor. It does not change the route, copy, layout, search, colors, or other controls.

## Verification

Development QA used manual browser checks and temporary Playwright scripts (not checked into the repository) against a running instance:

- Public: database inventory and counts, hero photo toggle and alt text, featured cards, Odisha links and filters, URL-synced search/sort/budget state, reload persistence, empty/error/retry states, property details and similar homes, contact and visit submissions, shared header, mobile navigation, Day/AMOLED persistence, and console checks.
- Accounts: registration role, login, signed-in header, profile persistence, photo upload/replacement/removal and private access, CSRF rejection, session revocation, generic reset responses, development reset link, single-use reset, and forged-role rejection.
- Administration: member search/filter/empty state, field validation, property create/edit, public propagation, cover and gallery uploads/replacement/removal, archive/restore/delete with confirmations, archived isolation, media cleanup, and narrow-viewport layout.
- Security: a 70-case API checklist covering role tampering, CSRF, origin checks, upload validation, password-reset token storage, admin data isolation, and static-file traversal.
- Optimization: Brotli/gzip negotiation with q-values, `Vary` and weak ETags, `304` revalidation, correct headers for JSON, error pages, `HEAD`, and byte ranges; responsive hero variant selection at 1×/2×/3× pixel density; card image paths; hero toggle; console/network errors; label, alt, duplicate-ID, heading, and overflow checks at 1280 px and 360 px; and byte-identical element geometry before and after the optimization pass on all nine page crops, AMOLED, and mobile.
- QA users and inquiries were removed after testing. The repository does not include an automated test runner.

## Production checklist

- Serve over HTTPS.
- Set `NODE_ENV=production`, `APP_ORIGIN` to the exact public HTTPS origin, and `DEV_SHOW_RESET_LINK=false` or remove it.
- Configure SMTP and verify a test reset email.
- Set `HOST` according to your topology. Keep `127.0.0.1` when a reverse proxy fronts the app and set `TRUST_PROXY=true` only for that trusted proxy.
- Point `DATABASE_PATH` and `STORAGE_DIR` at persistent, non-web-served volumes with restrictive permissions.
- Back up the database and both upload folders together, and test restoring them.
- Run the process as an unprivileged user and keep `.env` readable only by that user.
- Replace the in-memory rate limiter if you run more than one process.
- Do not expose `data/`, `storage/`, `.env`, or server logs through the reverse proxy; the Express app does not serve them, but the proxy should also deny them.
- Promote the first administrator through the CLI after creating the owner account, then sign in again.

## Project layout

```
index.html, listings.html, property.html, contact.html   Public pages
login.html, register.html, forgot-password.html,
reset-password.html, account.html, admin.html            Auth and private pages
403.html, 404.html                                       Error pages
style.css                                                Tokens, layout, components, accessibility media queries
appearance.css                                           Glass, theme, and settings-panel styles
admin.css                                                Admin portal layout and tables
scripts.js                                               Public listings, property view, hero, public interactions
js/                                                      Auth, account, admin, and appearance browser code
server/app.js                                            Express app, headers, compression, page guards, static allowlist
server/compress.js                                       Brotli/gzip response compression
server/routes.js                                         API handlers and server-side authorization
server/properties.js                                     Odisha constants, seed data, serialization, validation
server/property-images.js                                Property image validation, processing, storage
server/security.js                                       Hashing, tokens, sessions, validation, rate limits
server/db.js                                             Schema, migrations, SQLite setup, seeding
server/uploads.js                                        Avatar validation and processing
server/mailer.js                                         SMTP integration
server/init-db.js                                        Idempotent database initialization
server/promote-admin.js                                  First-administrator bootstrap
images/                                                  Listing images, hero source and WebP cutout ladders, placeholder
assets/                                                  Repository-only images used by this README (not served by the app)
robots.txt                                               Crawler rules for public and private routes
data/, storage/                                          Ignored runtime data (database and uploads)
legacy/                                                  Original project pages, not used by the site
```

## Known limits

- Demo seed homes are development content, not verified listings; replace or remove them before presenting the site as live inventory.
- SQLite and in-memory rate limits suit a single application instance.
- Property and avatar uploads use local disk; a multi-instance or serverless deployment needs shared storage or object storage.
- Inquiry messages are stored but not displayed in the admin portal.
- Profile photos are private to the owner and administrators; there is no public profile or public photo endpoint.
- Appearance preferences are per browser; they are not synced to the account.
- Without SMTP, password reset is limited to the development link flow; production requires an email provider.

## Buy me a coffee

Housing Baazaar is built and maintained in spare time. If it is useful to you, a small UPI payment keeps the coffee running and the updates coming.

<p align="center">
  <a href="upi://pay?pa=rb492713@ibl&pn=RAJESH%20BEHERA&mc=0000&mode=02&purpose=00">
    <img src="assets/buy-me-a-coffee-qr.png" alt="UPI QR code to buy Rajesh Behera a coffee for Housing Baazaar" width="240" height="237">
  </a>
</p>

Open any UPI app — Google Pay, PhonePe, Paytm, BHIM, or your bank app — point it at **Scan QR**, and scan the code above. If you are already on a phone, pay the UPI ID below instead; GitHub strips `upi:` deep links out of rendered markdown, so there is no tappable link here.

- Payee: **Rajesh Behera**
- UPI ID: `rb492713@ibl`
- Raw request, if you want to paste it: `upi://pay?pa=rb492713@ibl&pn=RAJESH%20BEHERA&mc=0000&mode=02&purpose=00`

Thank you.
