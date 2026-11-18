# Coding Practice Tracker — Requirements

## 1. Purpose

A personal tracker for organizing coding problems and recording which ones have been solved. It replaces a practice spreadsheet with a searchable problem list, reusable topic tags, and completion tracking.

Problems are solved on their original platforms, such as Codeforces, LeetCode, and CodeChef. This application stores references and personal progress; it does not run or judge submissions.

## 2. Primary use case

1. Create a topic called **Monotonic Stack**.
2. Add problems with their titles and original URLs.
3. Assign topics to each problem, such as **Monotonic Stack**, **Arrays**, and **Greedy**.
4. Open the Monotonic Stack topic to see the planned problems.
5. Follow a problem's link and solve it on its platform.
6. Mark it as solved in the tracker.
7. See the topic's solved count and remaining problems.

One problem can appear under several topics. It remains a single record with one completion status across all topic views.

## 3. Scope and assumptions

The confirmed core is manual problem entry, multiple topics per problem, topic-based organization, and marking problems solved.

The MVP requirements below add supporting behavior needed to make that core usable. Proposed defaults are documented explicitly; they are planning decisions, not previously confirmed user preferences.

- Each user has a personal problem library and personal topics.
- Completion is recorded manually and applies to the problem, not separately to each topic.
- Topics also serve as practice lists in the MVP. Separate named sheets or collections are deferred.
- A problem can have no topics and remain visible in the full library.
- Users can add previously solved problems as well as problems they intend to solve.
- The initial interface uses a compact table or list suitable for repeated tracking.
- Support private user accounts with email/password registration and login, plus forgot-password and reset-password flows. Registration requires only name, email, and password. Use Resend for email delivery. Every problem and topic is private to its owner.

## 4. MVP functional requirements

### FR-01: Manage problems

- Create a problem with a required title and original problem URL.
- Record its platform: Codeforces, LeetCode, CodeChef, or another platform.
- Support arbitrary valid HTTP or HTTPS problem URLs; do not restrict entry to a fixed platform list.
- Optionally record a platform problem identifier, difficulty/rating, and personal notes.
- Assign zero or more existing topics during creation or editing.
- View and edit a saved problem's information.
- Delete a problem after confirmation. Deletion removes its topic associations and excludes it from progress counts.
- Preserve multiline personal notes as plain text.

### FR-02: Manage topics

- Create, rename, and delete topics.
- Require a nonempty topic name, unique within the owner's library after trimming and case-insensitive comparison.
- Add topics to a problem and remove them without duplicating the problem.
- Prevent duplicate associations between the same problem and topic.
- Deleting a topic removes its associations but preserves its problems and their completion status.
- Confirm topic deletion and explain that the problems will remain.

### FR-03: Track completion

- Use two MVP statuses: **Unsolved** and **Solved**.
- Default a new problem to Unsolved, with an option to add it as already solved.
- Allow a user to mark a problem solved or revert it to unsolved.
- Record a completion timestamp when marked solved; clear it when reverted.
- Marking an already solved problem solved again must preserve its completion timestamp.
- Reverting and solving again records a new completion timestamp. Attempt history is outside the MVP.
- Update the status consistently in the library, every associated topic, and progress summaries.

### FR-04: Browse and find problems

- Show a full library with title, platform, topics, and status.
- Provide a topic view containing all problems assigned to that topic.
- Open the original problem in a new tab from its link.
- Search by title or platform problem identifier, ignoring case.
- Filter by status, platform, and topic; allow these filters to be combined with search.
- Provide an untagged filter for problems without topics.
- For multiple selected topics, the proposed default is matching any selected topic.
- Sort by title, date added, or completion date. Default to newest added first, with a stable tie-breaker.
- Paginate results so the full library does not need to load at once.
- Show clear empty states for a new library, an empty topic, and searches with no matches.

### FR-05: Show progress

- Show total, solved, and unsolved problem counts for the entire library.
- Show the same counts and completion percentage for each topic.
- Calculate topic completion as solved associated problems divided by total associated problems, multiplied by 100.
- Display 0% for a topic with no problems.
- Count each problem once in the overall totals, even if it has several topics.
- Label summaries clearly: overall/topic progress represents the full corresponding library/topic, while the result count represents the active filters.

### FR-06: Prevent accidental duplicates

- Prevent the same normalized problem URL from being added twice within one owner's library.
- On a duplicate, return a clear message and identify the existing problem so it can be opened or edited.
- For the MVP, trim URLs, normalize scheme and hostname casing, and remove fragments before comparison. Preserve path casing and query parameters because they may identify a problem.
- Different URLs for the same platform problem may still require manual detection; platform-specific canonicalization is deferred.
- Different users may independently track the same problem in their private libraries.

### FR-07: Registration and login

- Provide a registration screen and endpoint with exactly three required user-entered fields: **name, email, and password**. Do not require a username, phone number, or other profile fields.
- Trim and validate a nonempty name and a valid email address. Normalize email consistently for uniqueness, login, and password recovery; do not alter passwords silently.
- Enforce email uniqueness in PostgreSQL, including concurrent registration attempts. Reject duplicate registration with a useful validation/conflict response.
- Validate the agreed password policy on the server and communicate it in the UI. Use **Argon2id (Argon2)** for password hashing and verification, with a unique salt per password and parameters selected for the deployment environment. Store only the encoded password hash; never store plaintext or reversible encrypted passwords, or log submitted passwords.
- Provide login using email and password. Invalid credentials return a generic message without identifying which credential was wrong.
- Issue a **JWT access token and JWT refresh token** after successful login. Use a short-lived access token for protected API requests and a longer-lived refresh token to obtain a new access token.
- Validate JWT signatures, expiry, intended issuer/audience, and token purpose. Access and refresh tokens are not interchangeable; refresh tokens must not authorize normal resource endpoints.
- Rotate refresh tokens on successful refresh, invalidate the previous token, and track server-side session state to support logout and revocation. Store only a hash/digest of the refresh credential, not its raw value.
- Reject replay of a consumed refresh token and revoke its associated session/token family. Make refresh rotation atomic to prevent concurrent reuse; coordinate refresh requests in the frontend.
- Logout revokes the relevant refresh session. Password reset revokes all account sessions. Protected requests must enforce session revocation so existing access tokens cannot remain usable after the required invalidation.
- For the browser client, follow `../solve-tracker-frontend/AUTH_CONVENTIONS.md`: JWT access/refresh tokens are delivered through HttpOnly cookies via a same-origin API proxy, with CSRF protection and coordinated refresh. Select exact token lifetimes, signing algorithm/key management, and deployment-specific cookie/CSRF configuration before implementation. Keep signing secrets/keys in validated environment configuration and never expose refresh credentials in URLs or logs.
- Protect problem/topic APIs and tracker pages behind authentication. Authentication pages remain available without a session.
- Limit registration, login, and password-recovery attempts to reduce abuse. Select concrete limits during API design.
- Provide accessible form validation, pending states, and actionable errors. Preserve safe input such as name/email on failure; never expose password values in responses.

#### FR-07 addendum: Optional Google sign-in (GOOGLE-AUTH)

Design lock: [docs/GOOGLE_OAUTH_A0_RESULTS.md](docs/GOOGLE_OAUTH_A0_RESULTS.md). Phased implementation: [docs/GOOGLE_OAUTH_PHASED_PLAN.md](docs/GOOGLE_OAUTH_PHASED_PLAN.md).

- When enabled via configuration, offer **Continue with Google** on login and registration in addition to email/password; password registration and login remain fully supported.
- Google sign-in uses OAuth 2.0 authorization code with PKCE. Authorization codes and tokens are exchanged and validated **only on the backend**; do not expose Google tokens or JWT strings in API JSON or frontend JavaScript.
- Successful Google authentication issues the **same** HttpOnly access/refresh cookies and server-side session semantics as password login (`../solve-tracker-frontend/AUTH_CONVENTIONS.md`).
- Accounts may be **Google-only** (no password stored). Password policy applies when the user sets or changes a password. Google-only users cannot use password login until a password is set.
- **Account linking:** when Google reports `email_verified` and the normalized email matches an existing user, link the Google identity and sign in in one step; when `sub` is already linked, sign in that user; when no user exists, create a Google-only account. Reject unverified Google emails.
- The registration screen may offer Google alongside the three password fields; Google-first signup does not require a password on first sign-in.
- OAuth start and callback endpoints use cryptographic `state`, PKCE, safe redirect (`next`) rules, and rate limiting consistent with other auth endpoints.
- Signing out of the Google account in the browser does **not** end the Practice session by itself; Practice **Sign out** and password reset session revocation behave as for password login. When **Cross-Account Protection (RISC)** is enabled on the server, Google may end Practice sessions after app access revocation or certain security events (see addendum below).

#### FR-07 addendum: Optional Cross-Account Protection (RISC)

Design lock: [docs/GOOGLE_RISC_A0_RESULTS.md](docs/GOOGLE_RISC_A0_RESULTS.md). Rollup: [docs/GOOGLE_RISC_RESULTS.md](docs/GOOGLE_RISC_RESULTS.md).

- Optional; `GOOGLE_RISC_ENABLED=false` by default. When enabled, requires `GOOGLE_OAUTH_ENABLED=true` and configured OAuth client id.
- Google delivers Security Event Tokens to `POST /auth/google/risc`; the backend verifies SETs and may revoke **all** server-side sessions for the mapped Practice user. No Google tokens are stored in the application.
- Authorization (`AccessGuard`, HttpOnly cookies) is unchanged; clients detect revocation on the next session probe or refresh per [AUTH_CONVENTIONS.md](../solve-tracker-frontend/AUTH_CONVENTIONS.md).
- Use SET data and receipt rows only for security and session management ([RISC Terms of Service](https://developers.google.com/identity/protocols/risc)).

### FR-08: Forgot and reset password

- Provide a forgot-password screen and endpoint accepting the account email address.
- Return the same generic account-existence response for registered and unregistered addresses. Send a password-reset email only for an eligible registered account.
- Deliver password-reset email through **Resend** with a link to the frontend reset-password page. Keep the sender identity and trusted frontend URL in environment configuration.
- Generate a cryptographically secure reset token that is single-use and expires. Store only its hash and necessary lifecycle metadata; select the expiry duration before implementation.
- Do not construct reset URLs from untrusted request headers or user-supplied redirect URLs. Do not log reset tokens or include them in analytics.
- The reset-password page accepts the token from the link and lets the user enter a new password. A confirmation field may be used for reset UX; it is not an additional registration requirement.
- Validate token authenticity, expiry, and unused state before changing the password. Consume the token and update the password atomically to prevent replay or concurrent reuse.
- After a successful reset, invalidate other outstanding reset tokens and existing authenticated sessions for the account, then direct the user to log in using the new password. For Google-only accounts (no password yet), forgot-password applies only after the user has set a password; until then, authentication remains Google-only.
- Invalid or expired reset links show a clear message and a way to request a new link.

### FR-09: Resend email delivery

- Use Resend as the email provider, called only from backend code. Never expose its API key to the frontend.
- Configure the API key, sender identity, and frontend reset URL through environment variables and validate them with Zod for the email-enabled backend. Document their names in `.env.example` during implementation.
- Provide readable reset emails with the reset link, expiry guidance, and instructions to ignore the email if the user did not request it.
- Handle Resend/network failures explicitly, with safe operational logs. Do not mark a message as delivered merely because a request was attempted; provider acceptance and delivery are distinct states.
- A delivery failure must not invalidate a user's current password or reveal account existence through a different public response.
- Automated tests must mock the email provider or use an explicitly configured test setup; never send real user emails as part of routine tests.

## 5. Logical data requirements

These describe the domain independently of the PostgreSQL storage implementation.

| Entity | Required fields | Optional fields / notes |
| --- | --- | --- |
| Problem | ID, owner reference, title, URL, normalized URL, platform, status, created timestamp, updated timestamp | Platform problem identifier, difficulty label, numeric rating, notes, completion timestamp |
| Topic | ID, owner reference, name, normalized name, created timestamp, updated timestamp | — |
| ProblemTopic | Problem reference, topic reference | Unique problem/topic pair |
| User | ID, name, normalized unique email, password hash, created timestamp, updated timestamp | Email/password authentication |
| AuthSession | ID, user reference, refresh-token digest, expiry timestamp, revocation state | Rotation/token-family metadata; access JWTs reference the session for revocation checks |
| PasswordResetToken | ID, user reference, token hash, expiry timestamp | Consumption/revocation state; never persist the raw token |

- Problems and topics have a many-to-many relationship through ProblemTopic.
- All tracker data is **user-centric**: a user creates problems for their own practice only. There is no shared user-problem catalog, assignment to other users, or public problem library in the MVP.
- Every problem and topic requires an owner reference. Platform reference records may be shared; user-created problems, notes, tags/topics, completion state, and progress remain private.
- The same external problem URL can exist independently in different users' libraries. Editing or solving one user's entry must never change another user's entry.
- Scope every problem/topic lookup, mutation, association, list, search, and progress query to the authenticated owner. Do not fetch or update a resource by its ID alone without ownership enforcement.
- Difficulty labels and numeric ratings are separate optional values. Ratings from different platforms are not assumed to be comparable.
- Store timestamps consistently in UTC and display them in the user's local timezone.
- Do not store platform passwords, session cookies, or submission credentials.

## 6. Backend requirements

- Use the existing NestJS backend and pnpm project setup.
- Persist records in a database so progress survives restarts; PostgreSQL is required. Use Docker Compose for local PostgreSQL and Drizzle ORM with the `pg` driver and Drizzle Kit for versioned migrations. Follow `DRIZZLE_CONVENTIONS.md` for pinned versions and supported APIs.
- Provide API operations to create, read, update, and delete problems and topics; update completion; manage topic associations; query filtered problem lists; and retrieve progress summaries.
- Validate requests on the server, including trimmed nonempty titles/topic names, URL format, status values, referenced topic IDs, and pagination limits.
- Define and enforce field-length limits during API design, and expose those limits to the frontend.
- Return consistent validation, duplicate, missing-record, and unexpected-error responses with suitable HTTP status codes.
- Save a problem and its topic associations atomically, including edits, so partial updates cannot leave inconsistent records.
- Enforce duplicate constraints in persistent storage as well as request validation.
- Return pagination metadata and stable ordering for list endpoints.
- Document the API contract, filters, sort options, and error responses for the frontend.
- Derive ownership from the authenticated identity, authorize every read/write, and reject associations to another user's topics. Never accept a client-supplied owner ID as authorization.

## 7. Usability and quality requirements

- Adding a problem and toggling completion should require few steps.
- Use the same status labels and topic names throughout the interface.
- Support desktop and mobile layouts, keyboard navigation, labeled controls, and visible focus states.
- Show loading, success, and failure feedback. A failed save must not appear successful or discard entered form values.
- If a status update is optimistic, restore the previous state when the server rejects it.
- Keep persisted problem details, topic associations, and completion counts consistent after reloads.
- Verify core behavior with meaningful backend tests: duplicate prevention, topic associations/deletion, completion transitions, combined filters, progress counts, and ownership isolation and password-reset token expiry/reuse.
- Keep dependency installs reproducible through committed pnpm lockfiles.

## 8. MVP acceptance criteria

1. Given a valid title and URL, a user can save a problem and find it after reloading.
2. A problem assigned to Monotonic Stack and Arrays appears in both topic views and only once in the full library.
3. Marking that problem solved updates its status and both topics' solved counts; reverting it undoes those changes.
4. A library containing one solved problem with three topics reports one solved problem overall.
5. Removing one topic association leaves the problem and its other associations intact.
6. Deleting a topic leaves its problems available in the library.
7. Adding the same normalized URL again is rejected with a useful duplicate message.
8. A user can combine a title search, a platform filter, and an Unsolved filter to retrieve only matching problems.
9. An untagged problem can be created and found through the untagged filter.
10. A failed save displays an error and preserves the user's input.
11. Data remains available after a backend restart.
12. One user cannot read or change another user's problems or topics.
13. A user can register using only name, email, and password, then log in with email and password.
14. A registered user can request a password-reset email delivered through Resend and set a new password through its reset link.
15. An expired, invalid, or previously used reset token cannot change a password. The old password fails after reset, and the new password works.
16. Forgot-password responses do not reveal whether an email address is registered; delivery failures are handled without claiming that an email was delivered.
17. Login issues distinct JWT access and refresh tokens; expired tokens and tokens used for the wrong purpose are rejected.
18. Refresh rotates the credential atomically; replay is rejected. Logout revokes the session, and password reset revokes all sessions, including access to protected endpoints.
19. Two users can independently add the same problem URL, assign different topics, and track different solve states without affecting each other.
20. Stored password values are Argon2id hashes, and raw passwords, refresh tokens, and signing secrets never appear in logs or public API responses.

## 9. Optional later features

These are candidates for later work and are not MVP commitments.

| Feature | Purpose |
| --- | --- |
| Named sheets / collections | Group problems into plans such as Interview Prep independently of topic tags |
| Manual problem ordering | Arrange a topic or collection in a chosen practice sequence |
| Additional statuses | Track In Progress, Skipped, or Needs Review |
| Revision tracking | Record repeated solves, last reviewed dates, and review reminders |
| Attempt history and solution notes | Keep per-attempt notes, approach summaries, and solution links |
| Bulk actions | Tag or update several problems together |
| CSV import/export | Move existing spreadsheet data into the app and export personal records |
| Automatic metadata lookup | Fill titles, identifiers, and difficulty from supported platform links |
| Platform synchronization | Import submissions and update completion through supported integrations |
| Goals and activity history | Track practice targets and progress over time |
| Sharing | Publish selected sheets or topic lists with explicit visibility controls |

## 10. Outside the initial scope

- An online judge, code execution, or submission evaluation.
- A code editor or competitive programming contest platform.
- Social feeds, leaderboards, or collaborative editing.
- Automatic scraping, account linking, or automatic solved detection.
- AI recommendations or generated solutions.

## 11. Selected Phase 0 policies and release dependencies

Follow [PHASE_0_DECISIONS.md](../docs/PHASE_0_DECISIONS.md) for the detailed authentication, endpoint, configuration, and rate-limit contracts selected during Phase 0 execution.

- MVP organization uses topics/tags without separate sheets; entry is manual without CSV import; solve dates are server-recorded without historical editing.
- Registration creates the account, then the user logs in separately. Email verification is deferred; do not represent email ownership as verified.
- JWT access lifetime is 600 seconds, capped by the remaining absolute 604800-second session lifetime. Refresh rotation does not extend that deadline. Reset tokens expire after 1800 seconds.
- Use allowlisted HS256 with separate access/refresh secrets, Argon2id with the selected baseline parameters, and 8–128-code-point passwords. Validate explicit environment values; do not introduce hidden defaults.
- Retain immediate PostgreSQL-backed session revocation, HttpOnly cookie transport, same-origin API routing, and coordinated refresh.
- Production hosting/origin, verified Resend sender/credentials, representative hash-cost benchmarking, and production cookie/proxy testing remain release dependencies. They do not prevent local mocked integration work.

## 12. Required backend development workflow

- PostgreSQL is the backend database. Local development runs PostgreSQL and the NestJS backend through Docker Compose.
- `pnpm docker:dev:build` builds the backend image; `pnpm docker:dev` starts the backend (and postgres dependency). Nest runs in watch mode and picks up source edits without rebuilding the image.
- PostgreSQL data persists in a named volume across container restarts and normal Compose shutdowns.
- The backend waits for the PostgreSQL health check before starting.
- `pnpm db:migrate:docker` and `pnpm db:seed:docker` execute their base commands inside the already running backend container with `docker compose exec`; they do not launch temporary application containers.
- Base scripts `pnpm start:dev`, `pnpm db:migrate`, and `pnpm db:seed` run on the host using `DATABASE_URL` from `.env`, including an external PostgreSQL database.
- Compose uses `DOCKER_DATABASE_URL` for the backend container so the host URL can keep using `localhost` or an external database hostname.
- Migrations are versioned and applied explicitly, with migration history stored in PostgreSQL. Application startup does not synchronize or migrate the schema automatically.
- Seeds are explicit, transactional, and repeatable. The initial seed inserts Codeforces, LeetCode, and CodeChef into a shared platform reference table without changing existing rows. Custom problem platforms remain supported by the product requirements.
- Provide `.env.example`, exclude `.env` from Git and Docker build context, and document setup, migration, seeding, and shutdown commands.
- Source mounts must not replace container-installed dependencies with host `node_modules`.
- Changing dependencies requires rerunning the Docker start command to rebuild the image. Changing environment variables requires recreating the container.

## 13. Environment validation and API validation

- Compose must read environment values from `.env` or the exported environment, without hardcoded values or fallback defaults. Required Compose inputs must use fail-fast required-variable expressions.
- Validate runtime environment variables with Zod during bootstrap, including predefined process environment variables. Reject missing fields, invalid ports, invalid PostgreSQL URLs, invalid host values, invalid environment names, and nonliteral boolean strings.
- Read validated and converted configuration through Nest `ConfigService`; do not bypass validation with `process.env` or fallback values in application services.
- External-database host development requires only application variables. Docker-specific variables are required by Compose and validated when supplied to the application.
- Configuration validation must finish before database initialization and HTTP startup. Error messages must identify invalid fields without logging credentials or the entire environment.
- Use Zod schemas for request validation through Nest's native `StandardSchemaValidationPipe`, with schema-derived TypeScript types. Declare schemas explicitly on body, query, and path parameters.
- Generate Swagger/OpenAPI through `@nestjs/swagger`, reusing the same Zod request schemas via Standard JSON Schema. Explicitly annotate response schemas when endpoints are implemented.
- Control Swagger UI and JSON exposure through the validated `SWAGGER_ENABLED` environment variable. When enabled, serve them at `/docs` and `/docs-json`.

## 14. Drizzle implementation requirements

- Use the latest selected Drizzle ORM and compatible Drizzle Kit (currently both 1.0.0-rc.5), with exact version pins. Update conventions when deliberately upgrading; never mix 0.x and 1.0 RC APIs.
- Keep all database schemas under `src/database/schema/`, grouped in domain subfolders. Each domain has an `index.ts` barrel, and the root barrel exports every table and relation for runtime and Kit discovery.
- The Nest database service exposes a typed Drizzle client backed by the existing shared PostgreSQL pool.
- Use generated, reviewed, committed SQL migrations with snapshots/journal. Docker migration commands execute inside the running backend; host commands support external PostgreSQL through `.env`.
- Seeds use Drizzle and the same schema barrel, are transactional and repeatable, and close their connection pools.
- Generate migrations from the current schema and review the resulting SQL before applying it. Regeneration must not reset a database or change persisted migration history.
