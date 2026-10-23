import OpportunityTable from "./OpportunityTable";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  Send,
  CheckSquare,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  X,
  Download,
  Upload,
  LogOut,
  Mail,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  Check,
  Sprout,
  ShieldCheck,
  Circle,
  Menu,
} from "lucide-react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./style.css";
const names = {
  dashboard: "Overview",
  contact: "Contacts",
  opportunity: "Opportunities",
  application: "Applications",
  todo: "To-dos",
  settings: "Backup & settings",
};
const singular = {
  contact: "contact",
  opportunity: "opportunity",
  application: "application",
  todo: "to-do",
  interaction: "interaction",
};
const statuses = [
  "lead",
  "research",
  "submit",
  "follow-up",
  "interview",
  "pending",
  "offer",
  "rejection",
  "withdrawn",
  "closed",
];
const labels = (s) =>
  s.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const localToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateLabel = (d) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No date";
let csrf = "";
async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body instanceof URLSearchParams
        ? {}
        : { "Content-Type": "application/json" }),
      "X-CSRF-TOKEN": csrf,
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message = "Request failed. Please try again.";
    try {
      const b = await res.json();
      message =
        b.message ||
        (res.status === 401
          ? "Your session expired or the email/password is incorrect."
          : message);
    } catch {}
    throw Error(message);
  }
  return res.status === 204
    ? null
    : res.text().then((t) => (t ? JSON.parse(t) : null));
}
const blank = (kind) => ({
  kind,
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  company: "",
  relationship: kind === "contact" ? "network" : "",
  url: "",
  source: "",
  status:
    kind === "opportunity" ? "submit" : kind === "application" ? "lead" : "",
  opportunityId: "",
  contactId: "",
  dueDate: kind === "todo" ? localToday() : "",
  submittedDate: kind === "application" ? localToday() : "",
  occurredDate: kind === "interaction" ? localToday() : "",
  notes: "",
  contactIds: [],
  completed: false,
});
function App() {
  const [session, setSession] = useState(null),
    [records, setRecords] = useState([]),
    [page, setPage] = useState("dashboard"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [modal, setModal] = useState(null),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [restore, setRestore] = useState(null);
  const file = useRef();
  useEffect(() => {
    if (!modal && !detail && !restore) return;
    const previous = document.activeElement;
    const timer = setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs[dialogs.length - 1]
        ?.querySelector('input:not([type="checkbox"]),select,textarea,button')
        ?.focus();
    }, 20);
    function key(e) {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        setDetail(null);
        setRestore(null);
      }
      if (e.key === "Tab") {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        const dialog = dialogs[dialogs.length - 1];
        const nodes = dialog?.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [!!modal, !!detail, !!restore, busy]);
  async function getSession() {
    const s = await api("/session");
    csrf = s.csrf;
    setSession(s);
    return s;
  }
  async function refresh() {
    setRecords(await api("/entries"));
  }
  useEffect(() => {
    getSession()
      .then((s) => s.email && refresh())
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const all = (kind) => records.filter((r) => r.kind === kind),
    lookup = (id) => records.find((r) => r.id === id),
    title = (r) =>
      r?.kind === "contact"
        ? [r.firstName, r.lastName].filter(Boolean).join(" ")
        : r?.title || (r?.kind === "interaction" ? "Conversation" : "Untitled"),
    opp = (r) => lookup(r.opportunityId),
    today = localToday();
  const due = all("todo")
    .filter((t) => !t.completed && t.dueDate && t.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  function navigate(p) {
    setPage(p);
    setFilter("all");
    setQuery("");
    setDetail(null);
    setMobile(false);
  }
  function edit(kind, extra = {}) {
    setError("");
    const draft = { ...blank(kind), ...extra };
    if (kind === "opportunity" && extra.id) {
      draft.status =
        all("application").find((a) => a.opportunityId === extra.id)?.status ||
        "lead";
    }
    setModal(draft);
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...modal };
      if (
        !modal.id &&
        modal.kind === "application" &&
        ["lead", "research"].includes(modal.status)
      ) {
        payload.submittedDate = "";
      }
      await api("/entries" + (modal.id ? "/" + modal.id : ""), {
        method: modal.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      await refresh();
      setModal(null);
      setToast("Saved. One step closer.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(r) {
    try {
      await api("/entries/" + r.id, {
        method: "PUT",
        body: JSON.stringify({ ...r, completed: !r.completed }),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove(r) {
    if (
      !window.confirm(
        "Delete this " + singular[r.kind] + "? This cannot be undone.",
      )
    )
      return;
    try {
      await api("/entries/" + r.id, { method: "DELETE" });
      await refresh();
      setDetail(null);
      setToast("Record deleted");
    } catch (e) {
      setError(e.message);
    }
  }
  async function download() {
    try {
      const data = await api("/backup");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobsearchcrm-" + today + ".json";
      a.click();
      URL.revokeObjectURL(url);
      setToast("Backup downloaded. Store a copy somewhere safe.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function readBackup(e) {
    try {
      const f = e.target.files[0];
      if (!f) return;
      const data = JSON.parse(await f.text());
      if (data.version !== 1 || !Array.isArray(data.entries))
        throw Error("This is not a supported JobSearchCRM backup");
      setRestore(data);
    } catch (e) {
      setError(e.message);
    } finally {
      e.target.value = "";
    }
  }
  async function doRestore() {
    setBusy(true);
    try {
      const result = await api("/restore", {
        method: "POST",
        body: JSON.stringify(restore),
      });
      await refresh();
      setRestore(null);
      setToast(
        "Restored " +
          result.restored +
          " records. A recovery copy was saved on the server.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="loading">
        <Sprout size={30} />
        <p>{error || "Getting your workspace ready…"}</p>
      </div>
    );
  if (!session.email)
    return (
      <Login
        session={session}
        onSuccess={async () => {
          await getSession();
          await refresh();
        }}
        error={error}
        setError={setError}
      />
    );
  let visible = records.filter((r) =>
    query
      ? JSON.stringify([
          r.title,
          r.firstName,
          r.lastName,
          r.email,
          r.phone,
          r.linkedinUrl,
          r.company,
          r.source,
          r.status,
          r.relationship,
          r.dueDate,
          r.notes,
          title(opp(r)),
          title(lookup(r.contactId)),
          ...(r.contactIds || []).map((id) => title(lookup(id))),
        ])
          .toLowerCase()
          .includes(query.toLowerCase())
      : r.kind === page,
  );
  if (!query && filter !== "all")
    visible = visible.filter((r) =>
      page === "todo"
        ? filter === "complete"
          ? r.completed
          : filter === "due"
            ? !r.completed && r.dueDate && r.dueDate <= today
            : !r.completed
        : r.status === filter,
    );
  const activeApps = all("application").filter(
    (a) => !["rejection", "withdrawn", "closed", "offer"].includes(a.status),
  );
  const currentDetail = detail && lookup(detail);
  function badge(s) {
    return <span className={"badge " + s}>{labels(s || "lead")}</span>;
  }
  function taskRow(t) {
    return (
      <div className={"task-row " + (t.completed ? "done" : "")} key={t.id}>
        <button
          className="check-button"
          aria-label={t.completed ? "Mark incomplete" : "Complete " + t.title}
          onClick={() => toggle(t)}
        >
          {t.completed ? <Check size={14} /> : <Circle size={19} />}
        </button>
        <button className="task-label" onClick={() => setDetail(t.id)}>
          <strong>{t.title}</strong>
          <span>
            {opp(t) ? title(opp(t)) + " · " + opp(t).company : "Personal to-do"}
          </span>
        </button>
        <span
          className={
            "due " +
            (t.dueDate && t.dueDate < today && !t.completed ? "overdue" : "")
          }
        >
          {t.dueDate === today ? "Today" : dateLabel(t.dueDate)}
        </span>
        <button
          className="icon-button"
          aria-label="Edit to-do"
          onClick={() => edit("todo", t)}
        >
          <Pencil size={15} />
        </button>
      </div>
    );
  }
  return (
    <div className="app">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-icon">
            <Sprout size={22} />
          </span>
          nextchapter<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {[
            [LayoutDashboard, "dashboard"],
            [Users, "contact"],
            [BriefcaseBusiness, "opportunity"],
            [Send, "application"],
            [CheckSquare, "todo"],
          ].map(([Icon, p]) => (
            <button
              key={p}
              className={page === p ? "active" : ""}
              onClick={() => navigate(p)}
            >
              <Icon size={19} />
              {names[p]}
              {p === "todo" && due.length > 0 && (
                <span className="nav-count">{due.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-spark">✦</span>
          <strong>A little progress, every day.</strong>
          <p>Your next chapter starts with the next small step.</p>
        </div>
        <div className="sidebar-bottom">
          <button
            onClick={() => navigate("settings")}
            className={page === "settings" ? "active" : ""}
          >
            <ShieldCheck size={18} />
            Backup & settings
          </button>
          <div className="profile">
            <span className="avatar">{session.email[0].toUpperCase()}</span>
            <div>
              <strong>My workspace</strong>
              <small title={session.email}>{session.email}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                await api("/logout", { method: "POST" });
                setRecords([]);
                await getSession();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main inert={!!(modal || detail || restore)}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Toggle menu"
            >
              <Menu size={21} />
            </button>
            Workspace
            <ChevronRight size={14} />
            <strong>{names[page]}</strong>
          </div>
          <div className="top-date">
            <CalendarDays size={15} />
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "America/Los_Angeles",
            })}
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR JOB SEARCH, IN FOCUS</div>
              <h1>
                {query
                  ? "Search your workspace"
                  : page === "dashboard"
                    ? "Make room for what’s next."
                    : names[page]}
              </h1>
              <p>
                {page === "dashboard"
                  ? "A clear view of your connections, opportunities, and next steps."
                  : page === "settings"
                    ? "Keep your data safe and your workspace working for you."
                    : page === "contact"
                      ? "Good opportunities start with good connections."
                      : page === "opportunity"
                        ? "Keep promising roles on your radar."
                        : page === "application"
                          ? "Every application, from first lead to next chapter."
                          : "Small steps. Steady momentum."}
              </p>
            </div>
            {page !== "settings" && (
              <button
                className="primary"
                onClick={() =>
                  edit(page === "dashboard" ? "opportunity" : page)
                }
              >
                <Plus size={17} />
                Add {page === "dashboard" ? "opportunity" : singular[page]}
              </button>
            )}
          </div>
          {error && !modal && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={15} />
              </button>
            </div>
          )}
          {page !== "settings" && (
            <div className="search-line">
              <div className="searchbox">
                <Search size={18} />
                <input
                  aria-label="Search all records"
                  placeholder="Search contacts, opportunities, applications, and to-dos…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="icon-button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <span className="search-hint">
                A place for every possibility.
              </span>
            </div>
          )}
          {page === "dashboard" && !query ? (
            <>
              <div className="stats">
                {[
                  [
                    BriefcaseBusiness,
                    "Opportunities",
                    all("opportunity").length,
                    "Roles on your radar",
                    "opportunity",
                  ],
                  [
                    Send,
                    "Active applications",
                    activeApps.length,
                    "Moving forward",
                    "application",
                  ],
                  [
                    Users,
                    "Connections",
                    all("contact").length,
                    "People in your corner",
                    "contact",
                  ],
                  [
                    CheckSquare,
                    "Due & overdue",
                    due.length,
                    "Your next small steps",
                    "todo",
                  ],
                ].map(([Icon, label, count, sub, p]) => (
                  <button
                    className="stat"
                    key={p}
                    onClick={() => {
                      navigate(p);
                      if (p === "todo") setFilter("due");
                    }}
                  >
                    <div className="stat-top">
                      <span className={"stat-icon " + p}>
                        <Icon size={18} />
                      </span>
                      <ArrowUpRight size={16} />
                    </div>
                    <div className="stat-number">{count}</div>
                    <strong>{label}</strong>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Your next steps{" "}
                        <span className="count">{due.length}</span>
                      </h2>
                      <p>A little follow-through goes a long way.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("todo")}
                    >
                      All to-dos <ArrowRight size={15} />
                    </button>
                  </div>
                  {due.length ? (
                    due.slice(0, 6).map(taskRow)
                  ) : (
                    <div className="empty compact">
                      <span className="empty-icon">
                        <CheckSquare size={25} />
                      </span>
                      <h3>You’re all caught up.</h3>
                      <p>
                        Add a to-do or submit an application.
                        <br />
                        We’ll keep your follow-ups here.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => edit("todo")}
                      >
                        Add your next step <Plus size={15} />
                      </button>
                    </div>
                  )}
                </section>
                <section className="panel pipeline">
                  <div className="panel-heading">
                    <div>
                      <h2>Application journey</h2>
                      <p>See where things stand.</p>
                    </div>
                    <Send size={19} />
                  </div>
                  {[
                    "lead",
                    "research",
                    "submit",
                    "follow-up",
                    "interview",
                    "pending",
                  ].map((s, i) => {
                    const count = all("application").filter(
                      (a) => a.status === s,
                    ).length;
                    return (
                      <button
                        className="pipeline-row"
                        key={s}
                        onClick={() => {
                          navigate("application");
                          setFilter(s);
                        }}
                      >
                        <span className={"stage-dot stage-" + i} />
                        <span>{labels(s)}</span>
                        <div className="bar">
                          <div
                            style={{
                              width:
                                Math.max(
                                  0,
                                  (100 * count) /
                                    Math.max(1, all("application").length),
                                ) + "%",
                            }}
                          />
                        </div>
                        <strong>{count}</strong>
                      </button>
                    );
                  })}
                  <div className="pipeline-footer">
                    One step at a time is still forward.
                  </div>
                </section>
              </div>
              <section className="panel recent">
                <div className="panel-heading">
                  <div>
                    <h2>Opportunities on your radar</h2>
                    <p>Your next role could be right here.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("opportunity")}
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>
                {all("opportunity").length ? (
                  <div className="opportunity-grid">
                    {all("opportunity")
                      .slice(0, 3)
                      .map((r) => (
                        <button
                          className="opportunity-card"
                          key={r.id}
                          onClick={() => setDetail(r.id)}
                        >
                          <span className="company-logo">
                            {r.company.slice(0, 1).toUpperCase()}
                          </span>
                          <ArrowUpRight className="card-arrow" size={17} />
                          <h3>{r.title}</h3>
                          <p>{r.company}</p>
                          <div>
                            <span>{r.source || "Source not set"}</span>
                            {badge(
                              all("application").find(
                                (a) => a.opportunityId === r.id,
                              )?.status || "lead",
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty horizontal">
                    <span className="empty-icon">
                      <BriefcaseBusiness size={25} />
                    </span>
                    <div>
                      <h3>Your next chapter is an open book.</h3>
                      <p>Save a role that catches your eye to get started.</p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => edit("opportunity")}
                    >
                      Add an opportunity <Plus size={16} />
                    </button>
                  </div>
                )}
              </section>
              <div className="footer-note">
                <Sprout size={15} /> Built for progress, at your pace.
              </div>
            </>
          ) : null}
          {(query || !["dashboard", "settings"].includes(page)) && (
            <section className="panel records">
              <div className="list-heading">
                <h2>
                  {query ? "Search results" : names[page]}{" "}
                  <span className="count">{visible.length}</span>
                </h2>
                {!query && ["application", "todo"].includes(page) && (
                  <select
                    aria-label="Filter records"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All {names[page].toLowerCase()}</option>
                    {page === "todo" ? (
                      <>
                        <option value="open">Open</option>
                        <option value="due">Due & overdue</option>
                        <option value="complete">Completed</option>
                      </>
                    ) : (
                      statuses.map((s) => (
                        <option key={s} value={s}>
                          {labels(s)}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
              {visible.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">
                    <Search size={26} />
                  </span>
                  <h3>{query ? "No matches yet." : "A fresh start."}</h3>
                  <p>
                    {query
                      ? "Try another name, company, or keyword."
                      : "Add your first " +
                        singular[page] +
                        " to start building momentum."}
                  </p>
                  {!query && (
                    <button className="secondary" onClick={() => edit(page)}>
                      <Plus size={16} />
                      Add {singular[page]}
                    </button>
                  )}
                </div>
              ) : page === "opportunity" && !query ? (
                <OpportunityTable
                  opportunities={visible}
                  records={records}
                  onOpen={setDetail}
                  badge={badge}
                  dateLabel={dateLabel}
                />
              ) : (
                <div className="record-list">
                  {visible.map((r) =>
                    r.kind === "todo" ? (
                      taskRow(r)
                    ) : (
                      <button
                        className="record-row"
                        key={r.id}
                        onClick={() => setDetail(r.id)}
                      >
                        <span className={"record-avatar " + r.kind}>
                          {(r.kind === "contact"
                            ? r.firstName || r.lastName
                            : r.company || opp(r)?.company || "A"
                          )
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <div className="record-name">
                          <strong>
                            {r.kind === "application"
                              ? title(opp(r))
                              : title(r)}
                          </strong>
                          <span>
                            {r.kind === "contact"
                              ? [r.company, r.email, r.phone]
                                  .filter(Boolean)
                                  .join(" · ")
                              : r.kind === "application"
                                ? opp(r)?.company
                                : r.company}
                          </span>
                        </div>
                        <span className="record-meta">
                          {query
                            ? labels(r.kind)
                            : r.kind === "contact"
                              ? labels(r.relationship)
                              : r.kind === "opportunity"
                                ? r.source
                                : r.submittedDate
                                  ? "Submitted " + dateLabel(r.submittedDate)
                                  : "Not submitted"}
                        </span>
                        {r.kind === "application" ? (
                          badge(r.status)
                        ) : r.kind === "opportunity" ? (
                          <span className="contact-count">
                            <Users size={14} />
                            {r.contactIds.length}
                          </span>
                        ) : null}
                        <ChevronRight size={17} />
                      </button>
                    ),
                  )}
                </div>
              )}
            </section>
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="panel settings-card">
                <span className="empty-icon">
                  <ShieldCheck size={26} />
                </span>
                <h2>Your data, in your hands.</h2>
                <p>
                  Download a complete JSON backup of contacts, opportunities,
                  applications, interactions, and to-dos. Store a copy outside
                  this computer regularly.
                </p>
                <button className="primary" onClick={download}>
                  <Download size={17} />
                  Download backup
                </button>
                <hr />
                <h3>Restore from a backup</h3>
                <p>
                  Restore replaces all workspace records. Your account and
                  password stay the same. The server validates the file and
                  saves a recovery copy before replacing anything.
                </p>
                <input
                  type="file"
                  ref={file}
                  accept=".json,application/json"
                  hidden
                  onChange={readBackup}
                />
                <button
                  className="secondary"
                  onClick={() => file.current.click()}
                >
                  <Upload size={17} />
                  Choose backup file
                </button>
                <p className="fineprint">
                  Backups contain personal data. Keep them private. Account
                  credentials are never included.
                </p>
              </section>
              <section className="panel settings-card">
                <h2>Workspace preferences</h2>
                <dl>
                  <dt>Account</dt>
                  <dd>{session.email}</dd>
                  <dt>Timezone</dt>
                  <dd>America/Los_Angeles</dd>
                  <dt>Business days</dt>
                  <dd>Monday–Friday, including holidays</dd>
                  <dt>Follow-up schedule</dt>
                  <dd>
                    Next business day after submission, then 3 business days
                    later. Edit individual tasks anytime.
                  </dd>
                  <dt>Daily email digest</dt>
                  <dd>
                    9 a.m. Pacific ·{" "}
                    {session.mailEnabled ? "Enabled" : "Not configured"}
                  </dd>
                </dl>
                <div className="info">
                  <Mail size={18} />
                  <p>
                    {session.mailEnabled
                      ? "Your backend must be running to deliver email. Overdue work is included in the next digest."
                      : "Configure SMTP and enable email on the backend to receive reminders. In-app tasks work without email."}
                  </p>
                </div>
                <p className="fineprint">
                  The app sends a catch-up digest if started after 9 a.m. It
                  never sends follow-up emails to your contacts.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {currentDetail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <section
            className="detail"
            inert={!!modal}
            role="dialog"
            aria-modal="true"
            aria-label="Record details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-top">
              <span className="eyebrow">{labels(currentDetail.kind)}</span>
              <button
                className="icon-button"
                aria-label="Close details"
                onClick={() => setDetail(null)}
              >
                <X size={22} />
              </button>
            </div>
            <h2>
              {currentDetail.kind === "application"
                ? title(opp(currentDetail))
                : title(currentDetail)}
            </h2>
            <p className="muted">
              {currentDetail.company || opp(currentDetail)?.company}
            </p>
            <div className="detail-actions">
              <button
                className="secondary"
                onClick={() => edit(currentDetail.kind, currentDetail)}
              >
                <Pencil size={15} />
                Edit
              </button>
              <button
                className="icon-button danger"
                onClick={() => remove(currentDetail)}
                aria-label="Delete record"
              >
                <Trash2 size={17} />
              </button>
            </div>
            {currentDetail.status && badge(currentDetail.status)}
            <dl>
              {[
                ["Email", currentDetail.email],
                ["Phone", currentDetail.phone],
                ["LinkedIn", currentDetail.linkedinUrl],
                ["Relationship", currentDetail.relationship],
                ["Source", currentDetail.source],
                ["Due", currentDetail.dueDate],
                ["Submitted", currentDetail.submittedDate],
                ["Notes", currentDetail.notes],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd className="prewrap">
                      {k === "LinkedIn" ? (
                        <a
                          className="contact-link"
                          href={v}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {v}
                        </a>
                      ) : k === "Email" ? (
                        <a className="contact-link" href={"mailto:" + v}>
                          {v}
                        </a>
                      ) : (
                        v
                      )}
                    </dd>
                  </React.Fragment>
                ))}
            </dl>
            {currentDetail.kind === "application" &&
              currentDetail.history?.length > 0 && (
                <>
                  <div className="section-line">
                    <h3>Stage history</h3>
                  </div>
                  {[...currentDetail.history].reverse().map((h, i) => (
                    <p key={i} className="history-line">
                      {h.split(" | ")[1] && labels(h.split(" | ")[1])}
                      <span>
                        {new Date(h.split(" | ")[0]).toLocaleDateString(
                          "en-US",
                          {
                            timeZone: "America/Los_Angeles",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </p>
                  ))}
                </>
              )}
            {currentDetail.contactId && (
              <button
                className="linked-contact"
                onClick={() => setDetail(currentDetail.contactId)}
              >
                <Users size={16} />{" "}
                {currentDetail.kind === "opportunity" ? "Source: " : ""}
                {title(lookup(currentDetail.contactId))}
                <ChevronRight size={15} />
              </button>
            )}
            {currentDetail.url && (
              <a
                className="text-button"
                href={currentDetail.url}
                target="_blank"
                rel="noreferrer"
              >
                View job posting <ArrowUpRight size={15} />
              </a>
            )}
            {currentDetail.opportunityId && (
              <button
                className="text-button"
                onClick={() => setDetail(currentDetail.opportunityId)}
              >
                View opportunity <ArrowRight size={15} />
              </button>
            )}
            {currentDetail.contactIds.map((id) => (
              <button
                key={id}
                className="linked-contact"
                onClick={() => setDetail(id)}
              >
                <Users size={16} />
                {title(lookup(id))}
                <ChevronRight size={15} />
              </button>
            ))}
            {currentDetail.kind === "contact" && (
              <>
                <div className="section-line">
                  <h3>Interaction history</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      edit("interaction", { contactId: currentDetail.id })
                    }
                  >
                    <Plus size={15} />
                    Log interaction
                  </button>
                </div>
                {all("interaction")
                  .filter((i) => i.contactId === currentDetail.id)
                  .sort((a, b) => b.occurredDate.localeCompare(a.occurredDate))
                  .map((i) => (
                    <div className="interaction" key={i.id}>
                      <div>
                        <MessageSquare size={16} />
                        <strong>{i.title || "Conversation"}</strong>
                        <span>{dateLabel(i.occurredDate)}</span>
                        <button
                          className="icon-button"
                          aria-label="Edit interaction"
                          onClick={() => edit("interaction", i)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label="Delete interaction"
                          onClick={() => remove(i)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p>{i.notes}</p>
                    </div>
                  ))}
                {!all("interaction").some(
                  (i) => i.contactId === currentDetail.id,
                ) && (
                  <p className="muted">
                    No interactions logged yet. A quick note today helps your
                    next conversation.
                  </p>
                )}
              </>
            )}
            {currentDetail.kind === "opportunity" && (
              <>
                <div className="section-line">
                  <h3>Application</h3>
                </div>
                {all("application")
                  .filter((a) => a.opportunityId === currentDetail.id)
                  .map((a) => (
                    <button
                      className="linked-contact"
                      key={a.id}
                      onClick={() => setDetail(a.id)}
                    >
                      {badge(a.status)}
                      <ChevronRight size={16} />
                    </button>
                  ))}
                {!all("application").some(
                  (a) => a.opportunityId === currentDetail.id,
                ) && (
                  <button
                    className="secondary"
                    onClick={() =>
                      edit("application", { opportunityId: currentDetail.id })
                    }
                  >
                    <Plus size={15} />
                    Track application
                  </button>
                )}
                <div className="section-line">
                  <h3>Linked to-dos</h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      edit("todo", { opportunityId: currentDetail.id })
                    }
                  >
                    <Plus size={15} />
                    Add
                  </button>
                </div>
                {all("todo")
                  .filter((t) => t.opportunityId === currentDetail.id)
                  .sort(
                    (a, b) =>
                      (a.dueDate || "9999-12-31").localeCompare(
                        b.dueDate || "9999-12-31",
                      ) ||
                      a.createdAt.localeCompare(b.createdAt) ||
                      a.id.localeCompare(b.id),
                  )
                  .map(taskRow)}
              </>
            )}
          </section>
        </div>
      )}
      {modal && (
        <Editor
          key={modal.id || modal.kind}
          modal={modal}
          setModal={setModal}
          records={records}
          save={save}
          busy={busy}
          error={error}
        />
      )}
      {restore && (
        <div className="overlay">
          <section
            className="modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm restore"
          >
            <h2>Replace workspace data?</h2>
            <p>
              This will replace your {records.length} existing records with{" "}
              {restore.entries.length} records from the backup. A recovery copy
              is saved on the server first.
            </p>
            {error && <div className="error">{error}</div>}
            <div className="modal-footer">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setRestore(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy} onClick={doRestore}>
                {busy ? "Restoring…" : "Replace and restore"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Login({ session, onSuccess, error, setError }) {
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.target);
    try {
      const email = data.get("email").trim().toLowerCase(),
        password = data.get("password");
      if (session.setupRequired)
        await api("/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      await api("/login", {
        method: "POST",
        body: new URLSearchParams({ username: email, password }),
      });
      await onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <a className="brand">
          <span className="brand-icon">
            <Sprout size={23} />
          </span>
          nextchapter.
        </a>
        <div>
          <span className="eyebrow">A LITTLE PROGRESS, EVERY DAY</span>
          <h1>
            Your next chapter
            <br />
            starts here.
          </h1>
          <p>
            A calmer space for your job search.
            <br />
            Keep your connections, possibilities,
            <br />
            and next steps together.
          </p>
          <div className="story-line" />
          <span>Make a connection. Find a possibility. Take a step.</span>
        </div>
        <small>YOUR PERSONAL JOB SEARCH WORKSPACE</small>
      </div>
      <section className="login-form">
        <div className="login-card">
          <span className="empty-icon">
            <Sprout size={28} />
          </span>
          <h2>
            {session.setupRequired ? "Make yourself at home." : "Welcome back."}
          </h2>
          <p>
            {session.setupRequired
              ? "Create your personal account to get started."
              : "Your next steps are waiting for you."}
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  session.setupRequired ? "new-password" : "current-password"
                }
                required
                minLength={session.setupRequired ? 12 : 1}
                placeholder={
                  session.setupRequired
                    ? "At least 12 characters"
                    : "Your password"
                }
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "One moment…"
                : session.setupRequired
                  ? "Create my workspace"
                  : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-private">
            <ShieldCheck size={15} />
            Private by default. Built around you.
          </div>
        </div>
      </section>
    </div>
  );
}
function Editor({ modal: m, setModal, records, save, busy, error }) {
  const set = (k, v) => setModal((x) => ({ ...x, [k]: v }));
  const contacts = records.filter((r) => r.kind === "contact"),
    opportunities = records.filter((r) => r.kind === "opportunity");
  const name = (r) => [r.firstName, r.lastName].filter(Boolean).join(" ");
  const input = (key, label, type = "text", required = false) => (
    <label>
      {label}
      <input
        autoFocus={key === (m.kind === "contact" ? "firstName" : "title")}
        type={type}
        value={m[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        maxLength={type === "text" ? 1000 : undefined}
      />
    </label>
  );
  const opportunity = (
    <label>
      Opportunity{m.kind === "application" ? " *" : ""}
      <select
        required={m.kind === "application"}
        disabled={m.kind === "application" && !!m.id && !!m.submittedDate}
        value={m.opportunityId}
        onChange={(e) => set("opportunityId", e.target.value)}
      >
        <option value="">
          {m.kind === "application" ? "Choose an opportunity" : "None"}
        </option>
        {opportunities.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title} · {o.company}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="overlay" onClick={() => !busy && setModal(null)}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={(m.id ? "Edit " : "Add ") + singular[m.kind]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-top">
          <div>
            <span className="eyebrow">KEEP YOUR MOMENTUM</span>
            <h2>
              {m.id ? "Edit" : "Add"} {singular[m.kind]}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={busy}
            aria-label="Close editor"
            onClick={() => setModal(null)}
          >
            <X size={22} />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-fields">
            {m.kind === "contact" ? (
              <>
                <div className="form-grid">
                  {input("firstName", "First name")}
                  {input("lastName", "Last name")}
                </div>
                {input("email", "Email address (optional)", "email")}
                {input("phone", "Phone number (optional)", "tel")}
                {input("linkedinUrl", "LinkedIn URL (optional)", "url")}
                {input("company", "Company")}
                <label>
                  Relationship
                  <select
                    value={m.relationship}
                    onChange={(e) => set("relationship", e.target.value)}
                  >
                    {[
                      "network",
                      "recruiter",
                      "hiring manager",
                      "employee",
                      "other",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <p className="fineprint">
                  At least a first or last name is required.
                </p>
              </>
            ) : m.kind === "application" ? (
              <>
                {opportunity}
                <label>
                  Stage
                  <select
                    value={m.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {labels(s)}
                      </option>
                    ))}
                  </select>
                </label>
                {input("submittedDate", "Submission date", "date")}
                <div className="info">
                  <Clock3 size={18} />
                  <p>
                    Choose Submit to record the submission date and create two
                    editable follow-up tasks: next business day, then 3 business
                    days later. New Lead and Research applications stay
                    unsubmitted. Existing tasks keep their dates if you edit
                    this date.
                  </p>
                </div>
              </>
            ) : m.kind === "interaction" ? (
              <>
                <label>
                  Contact
                  <select
                    value={m.contactId}
                    onChange={(e) => set("contactId", e.target.value)}
                    required
                  >
                    <option value="">Choose a contact</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {name(c)}
                      </option>
                    ))}
                  </select>
                </label>
                {input("title", "Interaction type / subject")}
                {input("occurredDate", "Date", "date", true)}
                {opportunity}
              </>
            ) : (
              <>
                {input(
                  "title",
                  m.kind === "opportunity"
                    ? "Position title *"
                    : "To-do title *",
                  "text",
                  true,
                )}
                {m.kind === "opportunity" ? (
                  <>
                    {input("company", "Company *", "text", true)}
                    <label>
                      Status
                      <select
                        value={m.status}
                        onChange={(e) => set("status", e.target.value)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {labels(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="fineprint">
                      Submit records today's submission and schedules
                      follow-ups. The application then moves to Follow Up.
                      Choose Lead or Research to save an unsubmitted
                      opportunity.
                    </p>
                    {input("url", "Job posting URL", "url")}
                    {input(
                      "source",
                      "Source (e.g. LinkedIn, Wellfound, referral)",
                    )}
                    <p className="fineprint">
                      Add a source name above or choose a source contact below.
                    </p>
                    <label>
                      Source contact (optional)
                      <select
                        value={m.contactId}
                        onChange={(e) => set("contactId", e.target.value)}
                      >
                        <option value="">None</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {name(c)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset>
                      <legend>
                        Linked contacts <span className="muted">optional</span>
                      </legend>
                      {contacts.length ? (
                        contacts.map((c) => (
                          <label className="checkbox-label" key={c.id}>
                            <input
                              type="checkbox"
                              checked={m.contactIds.includes(c.id)}
                              onChange={(e) =>
                                set(
                                  "contactIds",
                                  e.target.checked
                                    ? [...m.contactIds, c.id]
                                    : m.contactIds.filter((id) => id !== c.id),
                                )
                              }
                            />
                            {name(c)}
                            <span>{c.company}</span>
                          </label>
                        ))
                      ) : (
                        <p className="fineprint">
                          Add contacts in your workspace, then link them here.
                        </p>
                      )}
                    </fieldset>
                  </>
                ) : (
                  <>
                    {opportunity}
                    <label>
                      Contact (optional)
                      <select
                        value={m.contactId}
                        onChange={(e) => set("contactId", e.target.value)}
                      >
                        <option value="">None</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {name(c)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {input("dueDate", "Due date", "date")}
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={(e) => set("completed", e.target.checked)}
                      />
                      Completed
                    </label>
                  </>
                )}
              </>
            )}
            <label>
              {m.kind === "interaction" ? "What happened? *" : "Notes"}
              <textarea
                rows={4}
                value={m.notes}
                maxLength={20000}
                required={m.kind === "interaction"}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={
                  m.kind === "interaction"
                    ? "A quick recap, helpful details, or what to do next…"
                    : "Anything you’d like to remember…"
                }
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => setModal(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save " + singular[m.kind]}
              <Check size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
