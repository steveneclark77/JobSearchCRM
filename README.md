# JobSearchCRM · Nextchapter

A personal job-search workspace built with React, Java 21 / Spring Boot, and SQL. Keep contacts, opportunities, applications, interaction notes, and next steps together. Local-first deployment; no external service is required for core use.

## Run locally

Install **Node.js 22+**, **JDK 21** (not just a JRE), and **Maven 3.9+**. From this repository:

```bash
./scripts/build.sh
./scripts/start.sh
```

### Windows: pull updates, rebuild, and run with one file

From the project folder, double-click **`rebuild-and-run.bat`**, or run it from PowerShell:

```powershell
.\rebuild-and-run.bat
```

Stop an existing app instance with Ctrl+C first. This requires a Git clone on `feat/personal-job-search-app` and Git for Windows on PATH. The batch file refuses local changes or untracked files, runs `git pull --ff-only origin feat/personal-job-search-app`, and stops if the update fails. It then checks for Node/npm, a Java JDK, and Maven, reinstalls frontend dependencies with `npm ci`, builds React, runs `mvn clean package` including backend tests, then starts Java from `backend` so it uses the existing `backend/data` database. It preserves your database and backups. It works when the project path contains spaces and uses the file's location rather than the terminal's starting folder.

If you originally downloaded a ZIP, first clone the app branch:

```powershell
git clone --branch feat/personal-job-search-app https://github.com/steveneclark77/JobSearchCRM.git
```

With the old app stopped, copy its entire `backend/data` folder into the new checkout's `backend` folder before launching. Keep the old folder and a downloaded JSON backup until you have confirmed your data is present.

Keep the window open while using the app. After startup, visit `http://127.0.0.1:8080` (or your configured `PORT`). Press Ctrl+C to stop; if Windows asks whether to terminate the batch job, choose Y. On a build/startup error, the window stays open so you can read the message. Existing SMTP, database, and other environment settings are inherited; this file does not load `.env` files. Git authentication uses your existing Git setup. If you set SMTP variables only in a PowerShell window, launch the batch file from that same window. The launcher invokes `npm` and `mvn` by command name so executable shims and standard Windows command wrappers are supported. Run it from the same terminal where those commands work if your tool manager sets PATH per session.

Open `http://127.0.0.1:8080`. Create the first personal account with an email and a password of at least 12 characters. Registration closes after the first account. Passwords are BCrypt hashed; authentication uses an HTTP-only session cookie and CSRF protection. No default account or sample personal data is created.

The production build serves React and the API from the same Java process. Local binding is loopback only. The database is stored in `backend/data/jobcrm.mv.db`; preserve this directory across upgrades. Stop with Ctrl+C. Application sessions expire after 8 hours of inactivity and are not preserved across restarts.

For development, run `mvn spring-boot:run` from `backend`, and `npm ci && npm run dev` from `frontend`. Vite proxies `/api` to the Java backend. Use the existing checkout: cloud tasks are already isolated and do not require a Git worktree.

### Docker alternative

```bash
docker compose up --build -d
```

The app is exposed only on `127.0.0.1:8080` and keeps its database in the `crm-data` volume. Do not run `docker compose down -v` unless you intend to erase that volume. Docker configuration is provided, but requires Docker to be installed on your machine.

## Workflow

Use the sidebar button in the desktop header to collapse the left navigation to an icon rail or expand it. Your preference is remembered in this browser. All navigation remains available when collapsed; on mobile, use the menu button to show or hide navigation.

New date inputs default to today in America/Los_Angeles. Editing preserves saved dates. New Lead/Research applications remain unsubmitted despite the suggested submission date; choose Submit to record submission and schedule follow-ups.

- **Contacts:** first/last name, optional email address, optional phone number, optional LinkedIn URL, company, relationship type, notes, and dated interaction logs. All three contact methods can be left blank. Phone numbers support international formatting and extensions. New fields are included in search and backups; older backups remain supported. One person can be linked to many opportunities.
- **Opportunity visibility:** Closed and Withdrawn opportunities are hidden by default. Select “Show closed and withdrawn” above the table to include them; returning to Opportunities resets this checkbox. Global search continues to find records in all statuses.
- **Table sorting:** Click any table column header to sort ascending; click again for descending. The arrow and accessible header state show the active direction. Company, status, and notes sort alphabetically (with natural number ordering); last updated sorts chronologically; next action sorts by due date and then task title. Blank values, undated actions, and missing actions stay after dated/populated values in either direction.
- **Opportunities list:** shows company with position beneath it, linked application status (Lead before an application exists), last update in Pacific time, earliest incomplete linked to-do (dated tasks first), and opportunity notes. Click the company or next action to open its details. Updates to linked work also refresh the opportunity timestamp; older records without a saved timestamp display “Not recorded” until their next update.
- **Opportunities:** position, company, job URL, source such as LinkedIn/Wellfound, optional source contact, multiple linked contacts, and an editable application status. New opportunities default to Submit, which records today’s submission, creates the linked application, schedules both follow-ups, and advances to Follow-up. Choose Lead or Research to capture an unsubmitted opportunity. Editing the status updates the existing linked application without duplicating follow-ups. Contacts are optional so you can capture leads quickly.
- **Applications:** one per opportunity, with lead → research → submit → follow-up → interview / rejection / pending, plus offer, withdrawn, and closed. All stages remain editable; the app records stage history.
- **Follow-ups:** choosing Submit uses today's Pacific date if a submission date is not supplied. Submission creates tasks for the next business day and then three business days after that first date. Friday submission → Monday → Thursday. Weekends are excluded; holidays count as business days. For existing applications, entering a submission date in lead/research also moves the application to follow-up. Re-saving does not duplicate tasks. Edit task dates individually; changing the submission date does not overwrite existing task dates. Submitted applications cannot be moved to a different opportunity.
- **Outcomes:** rejection, withdrawn, closed, or offer completes outstanding automatic follow-up tasks. Custom tasks stay open. Reopening an application does not recreate completed follow-ups; add a new task when needed.
- **To-dos:** optional contact and opportunity links, due date, notes, and completion tracking. Dates may be edited anytime.
- **Search:** global search across contacts, opportunities, applications, to-dos, and interaction notes; application stage and task completion/due filters are also available.

Suggestions kept deliberately simple: record a brief interaction recap and explicit next action; tailor follow-up timing to the conversation; archive an application with an outcome instead of deleting its history. After interviews, use custom tasks for thank-you notes and promised next steps.

## Email reminders

The app creates in-app tasks without email configuration. To send a **daily digest to your account email at 9 a.m. America/Los_Angeles**, export the following before starting Java (see `.env.example`; it is not automatically loaded):

```bash
export MAIL_ENABLED=true
export MAIL_FROM='your-verified-sender@example.com'
export SMTP_HOST='your-provider-smtp-host'
export SMTP_PORT=587
export SMTP_USERNAME='your-smtp-username'
# Set SMTP_PASSWORD securely in your shell/environment; do not commit it.
./scripts/start.sh
```

SMTP authentication and STARTTLS are enabled by default. Use your mail provider's SMTP/app credentials. Never put credentials into source control. For Docker, supply these variables through a compose override or a protected environment file, without committing secrets.

The backend must be running with network access to your SMTP host. It checks once a minute, includes due and overdue uncompleted tasks, and sends a catch-up digest if started after 9 a.m. No email is sent when nothing is due. Successful delivery date is persisted; failures are retried each minute. This is a personal single-process scheduler, with no strict exactly-once guarantee if the process crashes between sending and recording delivery. The app never sends outreach to your contacts automatically.

SMTP delivery against a real provider requires your configuration; automated tests verify recipient, digest contents, schedule gating, and failure handling without sending external mail.

## Backup and recovery

In **Backup & settings**, download a complete versioned JSON backup. It contains all workspace records, links, interaction history, stage history, and task dates. It excludes account passwords and email-server credentials. Store copies on a separate device or backup service; treat them as private personal data. A database file on the same disk is not an independent backup.

Restore validates the entire backup and record links before replacing workspace data in one database transaction. Restore is destructive and asks for confirmation. It preserves your existing account/password and first writes a recovery JSON file into `backend/data/backups/` (or `BACKUP_DIR`). Those recovery copies also contain private data and need protection and occasional cleanup. Restoring a recovery copy uses the same UI. Restore supports up to 50,000 records per backup.

**If database corruption prevents startup:** stop the app, preserve the damaged database and recovery files somewhere safe, and move `backend/data/jobcrm.mv.db` out of the data directory. Restart to create a clean database, create a new personal account, then restore your last downloaded JSON backup. With Docker, preserve the volume first and use a new volume for the clean instance. Do not delete your only copy of the damaged database. A JSON backup is independent of H2 and can restore into a PostgreSQL-backed instance too.

For a complete offline machine backup, stop the backend and copy the entire data directory. Do not copy a live H2 file as your only backup. Downloaded JSON is the supported live-backup route.

## Tests

```bash
cd backend && mvn test
cd ../frontend && npm ci && npm run build
```

Backend tests exercise authentication/CSRF, first-account registration, linked CRUD, business-day scheduling, idempotent follow-up creation, editable dates, outcome closure, backup round-trip, invalid restore preservation, and digest behavior.

Browser tests use an isolated backend with an empty in-memory database. Do not point them at your personal workspace:

```bash
# Build first. Terminal 1:
cd backend
DATABASE_URL='jdbc:h2:mem:e2e;DB_CLOSE_DELAY=-1' PORT=8081 java -jar target/jobcrm-0.1.0.jar
# Terminal 2:
cd frontend
npx playwright install chromium
npm run test:e2e
```

Set `CHROMIUM_PATH` to an existing Chromium executable to avoid downloading a browser. Browser tests create an account and records, test search and task edits, and download/restore a backup.

## Future hosting

The frontend and backend are separate source projects and can be deployed together as the packaged JAR or independently with a same-origin reverse proxy. A Dockerfile is included. To switch from local H2 to PostgreSQL, set `DATABASE_URL=jdbc:postgresql://host:5432/jobcrm`, `DATABASE_USER`, and `DATABASE_PASSWORD`, start with an empty database, and restore a JSON backup. H2's SQL storage is embedded, requiring no local database service. Each record is scoped to its owner on the backend; clients cannot supply ownership.

Before offering a public SaaS, add user enrollment/invitations, email verification and password recovery, login throttling, database migrations (replace `ddl-auto=update`), optimistic concurrency, monitored offsite backups, and a distributed reminder queue. Use HTTPS with `COOKIE_SECURE=true`, managed secrets, persistent storage, and explicit resource/rate limits. Keep the first-account setup private; do not expose an unclaimed instance to the Internet. The current app intentionally supports one personal account.
