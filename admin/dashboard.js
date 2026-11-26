import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updatePassword
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const OWNER_UID = "lxg9a4sm2Sf92pzdjVhUWrQr6lx2";
const auth = window.nnpFirebase?.auth;
const database = window.nnpFirebase?.database;
const main = document.getElementById("mainContent");
const definitions = {
  announcements: { title: "Announcements", path: "announcements", description: "Manage the public announcement feed.", fields: [{ key: "title", label: "Title", required: true }, { key: "message", label: "Message", type: "textarea", required: true }, { key: "category", label: "Category", type: "select", options: ["General", "Event", "Prayer", "Ministry", "Urgent"] }, { key: "published", label: "Publish to website", type: "checkbox" }], columns: ["title", "category", "published", "createdAt"] },
  events: { title: "Events & Calendar", path: "adminData/events", description: "Manage published website events and drafts. Published events appear on the homepage.", fields: [{ key: "title", label: "Event name", required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "time", label: "Time" }, { key: "location", label: "Location" }, { key: "description", label: "Description", type: "textarea" }, { key: "published", label: "Published", type: "checkbox" }], columns: ["title", "date", "location", "published"] },
  media: { title: "Media & Resources", path: "adminData/resources", description: "Manage public resource links.", fields: [{ key: "title", label: "Resource title", required: true }, { key: "type", label: "Type", type: "select", options: ["Photo", "Video", "Document", "Link"] }, { key: "url", label: "Public URL", type: "url" }, { key: "description", label: "Description", type: "textarea" }, { key: "published", label: "Published", type: "checkbox" }], columns: ["title", "type", "url", "published"] },
  membership: { title: "Membership", path: "adminData/membership", description: "Confidential membership records. All active executives can view; only secretaries can edit.", private: true, fields: [{ key: "name", label: "Full name", required: true }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" }, { key: "year", label: "Year / course" }, { key: "status", label: "Status", type: "select", options: ["Pending", "Active", "Inactive"] }, { key: "notes", label: "Private notes", type: "textarea" }], columns: ["name", "email", "year", "status"] },
  ministries: { title: "Ministries", path: "adminData/ministries", description: "Manage ministry profiles that appear on the public ministry page when published.", fields: [{ key: "name", label: "Ministry name", required: true }, { key: "leader", label: "Leader" }, { key: "description", label: "Description", type: "textarea" }, { key: "contact", label: "Contact" }, { key: "published", label: "Published", type: "checkbox" }], columns: ["name", "leader", "contact", "published"] },
  prayer: { title: "Prayer Requests", path: "adminData/prayerRequests", description: "Sensitive prayer records. All active executives can view; only the Prayer Coordinator edit.", private: true, fields: [{ key: "request", label: "Prayer request", type: "textarea", required: true }, { key: "submittedBy", label: "Submitted by" }, { key: "status", label: "Status", type: "select", options: ["New", "Praying", "Answered", "Archived"] }, { key: "private", label: "Confidential", type: "checkbox" }], columns: ["request", "submittedBy", "status"] },
  attendance: { title: "Attendance", path: "adminData/attendance", description: "Attendance records. All active executives can view; only the Ushering Coordinator can edit.", private: true, fields: [{ key: "date", label: "Date", type: "date", required: true }, { key: "event", label: "Meeting / event", required: true }, { key: "attendees", label: "Attendee names or IDs", type: "textarea" }, { key: "count", label: "Total", type: "number" }, { key: "notes", label: "Notes", type: "textarea" }], columns: ["date", "event", "count"] },
  library: { title: "Library", path: "adminData/library", description: "Manage catalogue entries shown on the public Library page.", fields: [{ key: "title", label: "Book title", required: true }, { key: "author", label: "Author" }, { key: "category", label: "Category" }, { key: "quantity", label: "Copies", type: "number" }, { key: "available", label: "Available", type: "checkbox" }, { key: "published", label: "Published", type: "checkbox" }], columns: ["title", "author", "category", "available"] }
};

let currentModule = "overview";
let currentUser = null;
let currentProfile = null;
let currentRole = "none";
let cache = {};
let moduleErrors = {};
let ministryApplications = {};
let ministryApplicationsError = "";
let activityEntries = [];
let adminDirectory = {};
let connected = false;
let calendarOffset = 0;
let listenersStarted = false;
let shellBound = false;
let settingsTab = "profile";
let adminEditorUid = "";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const isOwner = () => currentUser?.uid === OWNER_UID;
const activeAdmin = () => Boolean(currentUser && (isOwner() || (["admin", "content", "executive"].includes(currentRole) && currentProfile?.active === true)));
const fullAdmin = () => isOwner() || (currentRole === "admin" && currentProfile?.active === true);
const isExecutive = () => currentRole === "executive" && currentProfile?.active === true;
function canAccessModule(module) {
  if (!activeAdmin()) return false;
  if (module === "overview") return true;
  if (module === "settings") return true;
  if (module === "reports") return fullAdmin() || isExecutive();
  if (currentRole === "content") return Boolean(definitions[module] && !definitions[module].private);
  return Boolean(definitions[module]);
}
function canEditModule(module) {
  if (!activeAdmin() || !definitions[module]) return false;
  if (isOwner() || currentRole === "admin") return true;
  if (currentRole === "content") return !definitions[module].private;
  if (!isExecutive()) return false;
  if (["announcements", "events", "media", "ministries"].includes(module)) return true;
  const officePermissions = {
    membership: ["secretary"],
    prayer: ["prayer_coordinator"],
    attendance: ["ushering_coordinator"],
    library: ["librarian"]
  };
  return (officePermissions[module] || []).includes(currentProfile?.office);
}

function toast(message, kind = "") {
  const item = document.createElement("div");
  item.className = `toast-note ${kind}`;
  item.textContent = message;
  document.getElementById("toastWrap").append(item);
  window.setTimeout(() => item.remove(), 3800);
}

function updateIdentity() {
  const displayName = currentUser?.uid === OWNER_UID ? "System owner" : currentProfile?.name || currentUser?.displayName || "Administrator";
  const email = currentUser?.email || "Authorized account";
  document.getElementById("adminName").textContent = displayName;
  document.getElementById("adminEmail").textContent = email;
  document.getElementById("adminInitials").textContent = displayName.trim().charAt(0).toUpperCase() || "A";
}

async function authorize(user) {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;
  if (user.uid === OWNER_UID) {
    currentRole = "owner";
    currentProfile = { name: "system owner", active: true };
  } else {
    try {
      const snapshot = await get(ref(database, `adminData/admins/${user.uid}`));
      const profile = snapshot.val();
      const emailMatches = profile?.email?.toLowerCase() === user.email?.toLowerCase();
      if (!profile || profile.active !== true || !emailMatches || !["admin", "content", "executive"].includes(profile.role) || (profile.role === "executive" && !profile.office)) throw new Error("This account does not belong to any of the executives.");
      currentRole = profile.role;
      currentProfile = profile;
    } catch (error) {
      await signOut(auth);
      window.location.replace(`login.html?reason=${encodeURIComponent(error.code === "PERMISSION_DENIED" ? "rules" : "access")}`);
      return;
    }
  }

  updateIdentity();
  bindShell();
  startDataListeners();
  navigate(currentModule);
}

function bindShell() {
  if (shellBound) return;
  shellBound = true;
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.module)));
  document.getElementById("logoutButton").addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
  });
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const toggle = document.getElementById("menuToggle");
  const closeSidebar = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", open);
    backdrop.classList.toggle("show", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  backdrop.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSidebar(); });
  document.querySelectorAll(".nav-item").forEach((button) => { button.hidden = !canAccessModule(button.dataset.module); });
}

function startDataListeners() {
  if (listenersStarted) return;
  listenersStarted = true;
  onValue(ref(database, ".info/connected"), (snapshot) => {
    connected = snapshot.val() === true;
    const label = connected ? "Connected" : "Offline";
    document.getElementById("connectionState").textContent = connected ? "Database connected" : "Database offline";
    document.getElementById("connectionDot").style.background = connected ? "#45a968" : "#d3695f";
    document.getElementById("topConnectionState").textContent = label;
    document.querySelector(".live-pill").classList.toggle("is-connected", connected);
    document.querySelector(".live-pill").classList.toggle("is-offline", !connected);
    if (currentModule === "reports") renderReports();
    if (currentModule === "settings") renderSettings();
  });

  Object.entries(definitions).forEach(([key, definition]) => {
    if (!canAccessModule(key)) return;
    cache[key] = {};
    onValue(ref(database, definition.path), (snapshot) => {
      cache[key] = snapshot.val() || {};
      delete moduleErrors[key];
      refreshVisibleModule(key);
    }, (error) => {
      moduleErrors[key] = error.message || "Permission denied";
      refreshVisibleModule(key);
    });
  });

  // Applications are visible only to accounts already authorized to access Membership.
  if (canAccessModule("membership")) {
    onValue(ref(database, "ministryApplications"), (snapshot) => {
      ministryApplications = snapshot.val() || {};
      ministryApplicationsError = "";
      refreshVisibleModule("membership");
      refreshVisibleModule("ministries");
    }, (error) => {
      ministryApplicationsError = error.message || "Permission denied";
      refreshVisibleModule("membership");
      refreshVisibleModule("ministries");
    });
  }

  if (fullAdmin()) {
    onValue(ref(database, "adminData/activityLog"), (snapshot) => {
      activityEntries = Object.values(snapshot.val() || {});
      delete moduleErrors.activityLog;
      if (currentModule === "settings" && settingsTab === "activity") renderActivity();
    }, (error) => {
      moduleErrors.activityLog = error.message || "Permission denied";
      if (currentModule === "settings" && settingsTab === "activity") renderActivity();
    });
  }

  if (["admin", "executive"].includes(currentRole)) {
    onValue(ref(database, `adminData/admins/${currentUser.uid}`), (snapshot) => {
      const profile = snapshot.val();
      if (!profile || profile.active !== true || profile.email?.toLowerCase() !== currentUser.email?.toLowerCase() || !["admin", "content", "executive"].includes(profile.role) || (profile.role === "executive" && !profile.office)) {
        void signOut(auth).then(() => window.location.replace("login.html?reason=revoked"));
        return;
      }
      if (profile.role !== currentRole || profile.office !== currentProfile?.office) {
        window.location.reload();
        return;
      }
      currentProfile = profile;
      updateIdentity();
    }, () => {
      void signOut(auth).then(() => window.location.replace("login.html?reason=rules"));
    });
  }

  if (currentUser.uid === OWNER_UID) {
    onValue(ref(database, "adminData/admins"), (snapshot) => {
      adminDirectory = snapshot.val() || {};
      delete moduleErrors.admins;
      if (currentModule === "settings") renderAdminDirectory();
    }, (error) => {
      moduleErrors.admins = error.message || "Permission denied";
      if (currentModule === "settings") renderAdminDirectory();
    });
  }
}

function refreshVisibleModule(key) {
  if (currentModule === key && definitions[key]) renderTable(key, document.getElementById("searchRows")?.value || "");
  if (currentModule === "overview") renderOverview();
  if (currentModule === "reports") renderReports();
}

function navigate(module) {
  if (!canAccessModule(module)) {
    toast("Your executive role does not have access to this section.", "error");
    return;
  }
  currentModule = module;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.module === module));
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("show");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
  const titles = { overview: "Overview", reports: "Reports & Analytics", settings: "Settings" };
  document.getElementById("pageTitle").textContent = titles[module] || definitions[module]?.title || "Overview";
  if (module === "overview") renderOverview();
  else if (module === "reports") renderReports();
  else if (module === "settings") renderSettings();
  else renderCollection(module);
}

function cardStat(label, value, note) {
  return `<div class="stat-card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="note">${escapeHtml(note)}</div></div>`;
}

function renderOverview() {
  const sensitiveAccess = fullAdmin() || isExecutive();
  const stats = [
    cardStat("Published announcements", moduleErrors.announcements ? "Unavailable" : Object.values(cache.announcements || {}).filter((item) => item.published === true).length, "Existing public feed"),
    cardStat("Upcoming events", moduleErrors.events ? "Unavailable" : Object.values(cache.events || {}).filter((item) => item.date && new Date(item.date) >= new Date(new Date().toDateString())).length, "Published schedule"),
    cardStat("Membership records", !sensitiveAccess ? "Restricted" : moduleErrors.membership ? "Unavailable" : Object.keys(cache.membership || {}).length, "Private · executive access"),
    cardStat("Prayer requests", !sensitiveAccess ? "Restricted" : moduleErrors.prayer ? "Unavailable" : Object.keys(cache.prayer || {}).length, "Private · executive access")
  ];
  const actions = [["events", canEditModule("events") ? "Add event" : "View events"], ["membership", canEditModule("membership") ? "Manage membership" : "View membership"], ["prayer", canEditModule("prayer") ? "Manage prayer requests" : "View prayer requests"], ["attendance", canEditModule("attendance") ? "Record attendance" : "View attendance"], ["library", canEditModule("library") ? "Update library" : "View library"], ["settings", "Administrator settings"]].filter(([module]) => canAccessModule(module));
  main.innerHTML = `<section class="welcome"><div class="eyebrow">NNP EXECUTIVE PORTAL </div><h2>Welcome, ${escapeHtml(currentProfile?.name || "Administrator")}</h2><p>Keep announcements current, coordinate NNP C.U activities, and manage NNP CU website/App from here.</p><div class="welcome-actions"><button class="btn btn-sm btn-outline-light" data-go="announcements">＋ New announcement</button><button class="btn btn-sm btn-outline-light" data-go="events">View events</button></div></section><div class="stat-grid mt-3">${stats.join("")}</div><div class="split"><section class="panel"><div class="panel-title"><h3>Recent announcements</h3><button class="btn btn-sm btn-outline-success" data-go="announcements">View all</button></div><div id="recentAnnouncements"></div></section><section class="panel"><div class="panel-title"><h3>Quick actions</h3></div><div class="quick-grid">${actions.map(([id, label]) => `<button class="quick" data-go="${id}">${label}<span>Open section →</span></button>`).join("")}</div></section></div><div class="notice info mt-3">database is connected.</div>`;
  main.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
  const recent = Object.entries(cache.announcements || {}).filter(([, item]) => item.published === true).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0)).slice(0, 4);
  const host = document.getElementById("recentAnnouncements");
  host.innerHTML = moduleErrors.announcements
    ? `<div class="notice danger">Announcement access failed. Check the connection.</div>`
    : recent.length
      ? recent.map(([, item]) => `<div class="list-row"><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "")}</span></div>`).join("")
      : `<div class="empty">No published announcements yet.</div>`;
}

function renderCollection(module) {
  const definition = definitions[module];
  if (!definition) return;
  main.innerHTML = `<div class="module-head"><div><h2>${escapeHtml(definition.title)}</h2><p>${escapeHtml(definition.description)}</p></div>${canEditModule(module) ? `<button class="btn btn-green" id="addRecord">＋ Add ${module === "announcements" ? "announcement" : "record"}</button>` : `<span class="access-pill">View only</span>`}</div>${definition.private ? `<div class="notice info mb-3"><strong>Confidential data</strong> All Executives can view records. Editing is limited to that ministry coordinator </div>` : ""}${module === "events" ? `<section class="module-card mb-3"><div class="panel-title"><h3 id="calendarMonth"></h3><div><button class="btn btn-sm btn-outline-secondary" id="calPrev" aria-label="Previous month">‹</button> <button class="btn btn-sm btn-outline-secondary" id="calNext" aria-label="Next month">›</button></div></div><div id="calendarHost"></div></section>` : ""}<section class="module-card"><div class="toolbar"><input class="form-control" id="searchRows" placeholder="Search ${escapeHtml(definition.title.toLowerCase())}" aria-label="Search ${escapeHtml(definition.title)}"><span class="muted ms-auto">Database path: <code>${escapeHtml(definition.path)}</code></span></div><div id="tableHost" class="table-responsive"></div></section>`;
  document.getElementById("addRecord")?.addEventListener("click", () => openEditor(module));
  document.getElementById("searchRows").addEventListener("input", (event) => renderTable(module, event.target.value));
  if (module === "events") {
    document.getElementById("calPrev").addEventListener("click", () => { calendarOffset -= 1; renderCalendar(); });
    document.getElementById("calNext").addEventListener("click", () => { calendarOffset += 1; renderCalendar(); });
    renderCalendar();
  }
  renderTable(module);
}

function renderCalendar() {
  const host = document.getElementById("calendarHost");
  if (!host) return;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + calendarOffset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  document.getElementById("calendarMonth").textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const events = Object.values(cache.events || {});
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  host.innerHTML = `<div class="calendar-grid">${weekdays.map((day) => `<div class="muted text-center">${day}</div>`).join("")}${Array.from({ length: leading }, () => `<div class="calendar-cell"></div>`).join("")}${Array.from({ length: days }, (_, index) => { const day = index + 1; const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const count = events.filter((event) => event.date === iso).length; const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear(); return `<div class="calendar-cell ${isToday ? "today" : ""} ${count ? "event-day" : ""}">${day}${count ? `<div>${count} event${count === 1 ? "" : "s"}</div>` : ""}</div>`; }).join("")}</div>`;
}

function renderTable(module, search = "") {
  const definition = definitions[module];
  const host = document.getElementById("tableHost");
  if (!host) return;
  if (moduleErrors[module]) {
    host.innerHTML = `<div class="notice danger">Database access failed for <code>${escapeHtml(definition.path)}</code>. Check the active administrator status and Firebase rules, then reload. ${escapeHtml(moduleErrors[module])}</div>`;
    return;
  }
  if (module === "events") renderCalendar();
  const entries = Object.entries(cache[module] || {}).filter(([, item]) => item && typeof item === "object").sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0)).filter(([, item]) => !search || Object.values(item).some((value) => String(value).toLowerCase().includes(search.toLowerCase())));
  if (!entries.length) {
    host.innerHTML = `<div class="empty">No ${escapeHtml(definition.title.toLowerCase())} records yet.</div>`;
  } else {
    host.innerHTML = `<table class="table"><thead><tr>${definition.columns.map((key) => `<th>${escapeHtml(key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase()))}</th>`).join("")}${canEditModule(module) ? "<th>Actions</th>" : ""}</tr></thead><tbody>${entries.map(([id, item]) => `<tr>${definition.columns.map((key) => `<td>${["published", "available", "status"].includes(key) ? `<span class="badge-status ${statusClass(item[key])}">${escapeHtml(display(item[key], key))}</span>` : `<span title="${escapeHtml(item[key])}">${escapeHtml(display(item[key], key)).slice(0, 100)}</span>`}</td>`).join("")}${canEditModule(module) ? `<td class="text-nowrap"><button class="btn btn-sm btn-light" data-edit="${escapeHtml(id)}">Edit</button> <button class="btn btn-sm btn-outline-danger" data-delete="${escapeHtml(id)}">Delete</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
    if (canEditModule(module)) {
      host.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditor(module, button.dataset.edit)));
      host.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteRecord(module, button.dataset.delete)));
    }
  }
  if (module === "membership" || module === "ministries") renderMinistryApplications(module, search);
}

function renderMinistryApplications(module, search = "") {
  const host = document.getElementById("tableHost");
  const applications = Object.entries(ministryApplications || {})
    .filter(([, item]) => item && typeof item === "object")
    .sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0))
    .filter(([, item]) => !search || [item.name, item.regNumber, item.phone, item.ministryName, item.status].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));

  const heading = module === "membership" ? "Ministry enrolment applications" : "Students enrolled in ministries";
  const description = module === "membership"
    ? "Applications submitted from the public Ministries page. These are separate from manually maintained membership records."
    : "Live enrolment list, grouped by the ministry selected by each student.";
  let html = `<section class="mt-4"><div class="module-head"><div><h3>${heading}</h3><p>${description}</p></div><span class="access-pill">${applications.length} application${applications.length === 1 ? "" : "s"}</span></div>`;
  if (ministryApplicationsError) {
    html += `<div class="notice danger">Could not load ministry applications. Check the ministryApplications read rule. ${escapeHtml(ministryApplicationsError)}</div>`;
  } else if (!applications.length) {
    html += `<div class="empty">No ministry enrolment applications have been submitted yet.</div>`;
  } else {
    const columns = module === "membership"
      ? ["name", "regNumber", "phone", "ministryName", "status", "createdAt"]
      : ["ministryName", "name", "regNumber", "phone", "status", "createdAt"];
    html += `<div class="table-responsive"><table class="table"><thead><tr>${columns.map((key) => `<th>${escapeHtml(({ name: "Student", regNumber: "Registration No.", phone: "Phone", ministryName: "Ministry", status: "Application status", createdAt: "Submitted" })[key])}</th>${""}`).join("")}${canEditModule("membership") ? "<th>Update status</th>" : ""}</tr></thead><tbody>`;
    html += applications.map(([id, item]) => `<tr>${columns.map((key) => `<td>${key === "status" ? `<span class="badge-status ${statusClass(item.status)}">${escapeHtml(item.status || "Pending")}</span>` : key === "createdAt" ? escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString() : "—") : escapeHtml(item[key] || "—")}</td>`).join("")}${canEditModule("membership") ? `<td><select class="form-select form-select-sm" data-application-status="${escapeHtml(id)}"><option ${item.status === "Pending" ? "selected" : ""}>Pending</option><option ${item.status === "Approved" ? "selected" : ""}>Approved</option><option ${item.status === "Declined" ? "selected" : ""}>Declined</option></select></td>` : ""}</tr>`).join("");
    html += `</tbody></table></div>`;
  }
  html += `</section>`;
  host.insertAdjacentHTML("beforeend", html);
  if (canEditModule("membership")) {
    host.querySelectorAll("[data-application-status]").forEach((select) => select.addEventListener("change", async () => {
      const id = select.dataset.applicationStatus;
      const nextStatus = select.value;
      try {
        await update(ref(database, `ministryApplications/${id}`), { status: nextStatus, reviewedAt: Date.now(), reviewedBy: currentUser.uid });
        await logActivity("updated application status", "ministryApplications", id);
        toast("Application status updated.");
      } catch (error) {
        toast(`Could not update application: ${error.message}`, "error");
      }
    }));
  }
}

function statusClass(value) {
  const status = String(value || "").toLowerCase();
  return ["true", "active", "answered", "available"].includes(status) ? "" : ["false", "draft", "pending", "new", "inactive"].includes(status) ? "draft" : "private";
}

function display(value, key) {
  if (key === "published" || key === "available") return value === true ? "Published" : "Draft";
  if (key === "createdAt" && value) return new Date(value).toLocaleDateString();
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function openEditor(module, id) {
  if (!canEditModule(module)) return toast("Your role does not have editing permission for this section.", "error");
  const definition = definitions[module];
  const row = id ? cache[module]?.[id] || {} : {};
  const form = document.createElement("form");
  form.id = "recordForm";
  form.innerHTML = definition.fields.map((field) => {
    const value = row[field.key] ?? (field.key === "published" && module === "announcements" && !id ? true : "");
    if (field.type === "checkbox") return `<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="f_${field.key}" name="${field.key}" ${value === true ? "checked" : ""}><label class="form-check-label form-label" for="f_${field.key}">${escapeHtml(field.label)}</label></div>`;
    if (field.type === "textarea") return `<div class="mb-3"><label class="form-label" for="f_${field.key}">${escapeHtml(field.label)}</label><textarea class="form-control" id="f_${field.key}" name="${field.key}" rows="3" ${field.required ? "required" : ""}>${escapeHtml(value)}</textarea></div>`;
    if (field.type === "select") return `<div class="mb-3"><label class="form-label" for="f_${field.key}">${escapeHtml(field.label)}</label><select class="form-select" id="f_${field.key}" name="${field.key}">${field.options.map((option) => `<option ${String(value) === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
    return `<div class="mb-3"><label class="form-label" for="f_${field.key}">${escapeHtml(field.label)}</label><input class="form-control" id="f_${field.key}" name="${field.key}" type="${field.type || "text"}" value="${escapeHtml(value)}" ${field.required ? "required" : ""}></div>`;
  }).join("");

  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title fs-6">${id ? "Edit" : "Add"} ${escapeHtml(definition.title.replace(/s$/, ""))}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button><button class="btn btn-sm btn-green" type="submit" form="recordForm">Save record</button></div></div></div>`;
  modal.querySelector(".modal-body").append(form);
  document.body.append(modal);
  const instance = new bootstrap.Modal(modal);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEditModule(module)) return toast("Your role does not have editing permission for this section.", "error");
    const data = {};
    for (const field of definition.fields) {
      const input = form.elements[field.key];
      data[field.key] = field.type === "checkbox" ? input.checked : input.value.trim();
      if (field.type === "number" && data[field.key] !== "") data[field.key] = Number(data[field.key]);
    }
    try {
      if (module === "announcements") {
        if (!id) {
          data.createdAt = Date.now();
          data.createdBy = currentUser.uid;
          await set(push(ref(database, definition.path)), data);
        } else await update(ref(database, `${definition.path}/${id}`), data);
      } else {
        data.updatedAt = Date.now();
        data.updatedBy = currentUser.uid;
        if (!id) {
          data.createdAt = Date.now();
          data.createdBy = currentUser.uid;
          await set(push(ref(database, definition.path)), data);
        } else await update(ref(database, `${definition.path}/${id}`), data);
      }
      await logActivity(id ? "updated" : "created", module, id || "new");
      instance.hide();
      toast("Record saved successfully.");
    } catch (error) {
      toast(`Save failed: ${error.message}`, "error");
    }
  });
  modal.addEventListener("hidden.bs.modal", () => modal.remove(), { once: true });
  instance.show();
}

async function deleteRecord(module, id) {
  if (!canEditModule(module)) return toast("Your role does not have editing permission for this section.", "error");
  if (!window.confirm("Permanently delete this record?")) return;
  try {
    await remove(ref(database, `${definitions[module].path}/${id}`));
    await logActivity("deleted", module, id);
    toast("Record deleted.");
  } catch (error) {
    toast(`Delete failed: ${error.message}`, "error");
  }
}

async function logActivity(action, module, recordId = "") {
  if (!activeAdmin()) return;
  try {
    await set(push(ref(database, "adminData/activityLog")), { action, module, recordId, actorUid: currentUser.uid, actorEmail: currentUser.email || "", createdAt: Date.now() });
  } catch (error) {
    console.warn("Activity log could not be saved. Check the active-admin activityLog rule.", error.code);
  }
}

function renderReports() {
  const summaries = Object.entries(definitions).map(([key, definition]) => ({ name: definition.title, count: moduleErrors[key] ? "Unavailable" : Object.keys(cache[key] || {}).length, private: definition.private }));
  if (fullAdmin()) summaries.push({ name: "Activity log", count: moduleErrors.activityLog ? "Unavailable" : activityEntries.length, private: true });
  const attendanceTotal = moduleErrors.attendance ? "Unavailable" : Object.values(cache.attendance || {}).reduce((sum, record) => sum + (Number(record.count) || 0), 0);
  main.innerHTML = `<div class="module-head"><div><h2>Reports &amp; Analytics</h2><p>Live counts from records accessible to your executive account.</p></div><div><span class="access-pill me-2">${connected ? "Live connection" : "Offline"}</span><button class="btn btn-sm btn-outline-success" id="exportReport">Download CSV</button></div></div><div class="stat-grid">${cardStat("Recorded attendance", attendanceTotal, "Sum of saved meeting totals")}${cardStat("Published events", moduleErrors.events ? "Unavailable" : Object.values(cache.events || {}).filter((item) => item.published === true).length, "Database records")}${cardStat("Active members", moduleErrors.membership ? "Unavailable" : Object.values(cache.membership || {}).filter((item) => item.status === "Active").length, "Private records")}${cardStat("Open prayer requests", moduleErrors.prayer ? "Unavailable" : Object.values(cache.prayer || {}).filter((item) => !["Answered", "Archived"].includes(item.status)).length, "Private records")}</div><section class="module-card mt-3"><h3 class="section-heading mt-0">Record inventory</h3><div class="table-responsive"><table class="table"><thead><tr><th>Module</th><th>Records</th><th>Data access</th></tr></thead><tbody>${summaries.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.count)}</td><td>${item.private ? '<span class="badge-status private">Private</span>' : '<span class="badge-status">Admin-managed</span>'}</td></tr>`).join("")}</tbody></table></div><p class="muted mt-3">The CSV includes module totals only; it excludes private member and prayer details.</p></section>`;
  document.getElementById("exportReport").addEventListener("click", () => {
    const rows = [["Module", "Records"], ...summaries.map((item) => [item.name, String(item.count)]), ["Recorded attendance", String(attendanceTotal)]];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `nnp-cu-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function renderSettings(tab = settingsTab) {
  settingsTab = tab;
  const owner = isOwner();
  const tabs = owner ? [["profile", "My account"], ["admins", "Administrators"], ["security", "Security & connection"], ["activity", "Activity log"]] : fullAdmin() ? [["profile", "My account"], ["security", "Security & connection"], ["activity", "Activity log"]] : [["profile", "My account"], ["security", "Security & connection"]];
  main.innerHTML = `<div class="module-head"><div><h2>Settings</h2><p>Manage your sign-in, and dashboard activity.</p></div><span class="access-pill ${currentRole === "owner" ? "role-owner" : "role-admin"}">${currentRole === "owner" ? "Owner" : currentRole === "content" ? "Content editor" : currentRole === "executive" ? `Executive · ${escapeHtml(currentProfile?.office || "office not assigned")}` : "Administrator"}</span></div><nav class="settings-tabs" aria-label="Settings sections">${tabs.map(([id, label]) => `<button class="settings-tab ${id === tab ? "active" : ""}" data-settings-tab="${id}">${label}</button>`).join("")}</nav><section class="settings-section ${tab === "profile" ? "active" : ""}" data-settings-section="profile"><div class="split"><section class="panel"><div class="panel-title"><h3>Administrator account</h3><span class="access-pill ${currentRole === "owner" ? "role-owner" : "role-admin"}">${currentRole === "owner" ? "Owner" : currentRole === "content" ? "Content editor" : currentRole === "executive" ? `Executive · ${escapeHtml(currentProfile?.office || "office not assigned")}` : "Administrator"}</span></div><div class="profile-card"><span class="profile-avatar">${escapeHtml((currentProfile?.name || currentUser.email || "A").charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(currentProfile?.name || (currentRole === "owner" ? "Workspace owner" : "Administrator"))}</strong><small>${escapeHtml(currentUser.email || "")}</small></span></div></section><section class="panel"><div class="panel-title"><h3>Change password</h3></div><form id="passwordForm"><div class="mb-3"><label class="form-label" for="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" class="form-control" autocomplete="current-password" required></div><div class="mb-3"><label class="form-label" for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" class="form-control" minlength="8" autocomplete="new-password" required><div class="form-text">Use at least 8 characters.</div></div><button class="btn btn-green" type="submit">Update password</button><div id="passwordFeedback" class="mt-3" aria-live="polite"></div></form></section></div></section><section class="settings-section ${tab === "admins" ? "active" : ""}" data-settings-section="admins">${owner ? renderAdminsSection() : `<div class="notice danger">Only the system owner can manage administrator access.</div>`}</section><section class="settings-section ${tab === "security" ? "active" : ""}" data-settings-section="security"><div class="stat-grid">${cardStat("Database", connected ? "Connected" : "Offline", "Realtime Database")}${cardStat("Project", "NNP Christian Union", "Existing Firebase project")}${cardStat("Access model", owner ? "Owner + admins" : currentRole === "content" ? "Content editor" : "Administrator", "Role-based permissions")}</div><section class="panel"><div class="panel-title"><h3>Security notes</h3></div><p class="muted">Admin enforce access.</p><div class="notice info">Only the Admin account can grant access status. Any user account can be suspended by admin due to account violation. </div</section></section>${fullAdmin() ? `<section class="settings-section ${tab === "activity" ? "active" : ""}" data-settings-section="activity"><section class="panel"><div class="panel-title"><h3>Recent dashboard changes</h3><span class="muted">Admin-only audit entries</span></div><div id="settingsActivity"></div></section></section>` : ""}`;
  main.querySelectorAll("[data-settings-tab]").forEach((button) => button.addEventListener("click", () => renderSettings(button.dataset.settingsTab)));
  if (tab === "profile") bindPasswordForm();
  if (tab === "admins" && isOwner) bindAdminForm();
  if (tab === "activity") renderActivity();
  if (tab === "admins" && isOwner) renderAdminDirectory();
}

function renderAdminsSection() {
  const editing = adminEditorUid ? adminDirectory[adminEditorUid] || {} : {};
  return `<div class="split"><section class="panel"><div class="panel-title"><h3>${adminEditorUid ? "Edit administrator" : "Grant dashboard access"}</h3><span class="access-pill role-owner">Owner only</span></div><div class="notice info mb-3">Create the account in Firebase Authentication first, then assign its exact UID, email, name, role and (for executives) office here. Firebase rules enforce the office permissions.</div><form id="adminForm"><div class="admin-form-grid"><div class="mb-3"><label class="form-label" for="adminUid">Firebase Auth UID</label><input class="form-control" id="adminUid" name="uid" minlength="10" maxlength="128" autocomplete="off" value="${escapeHtml(adminEditorUid)}" ${adminEditorUid ? "readonly" : ""} required></div><div class="mb-3"><label class="form-label" for="adminEmailInput">Account email</label><input class="form-control" id="adminEmailInput" name="email" type="email" value="${escapeHtml(editing.email || "")}" required></div><div class="mb-3"><label class="form-label" for="adminDisplayName">Display name</label><input class="form-control" id="adminDisplayName" name="name" maxlength="80" value="${escapeHtml(editing.name || "")}" required></div><div class="mb-3"><label class="form-label" for="adminRole">Role</label><select class="form-select" id="adminRole" name="role"><option value="admin" ${editing.role === "admin" ? "selected" : ""}>Administrator · all modules</option><option value="content" ${editing.role === "content" ? "selected" : ""}>Content editor · legacy access</option><option value="executive" ${editing.role === "executive" ? "selected" : ""}>Executive · office-based access</option></select></div><div class="mb-3"><label class="form-label" for="adminOffice">Executive office</label><select class="form-select" id="adminOffice" name="office"><option value="">Not applicable</option>${[["chairperson","Chairperson"],["vice_chairperson","Vice Chairperson"],["mission_coordinator","Mission Coordinator"],["prayer_coordinator","Prayer Coordinator"],["praise_worship_coordinator","Praise & Worship Coordinator"],["treasurer","Treasurer"],["secretary","Secretary"],["ushering_coordinator","Ushering Coordinator"],["bible_study_coordinator","Bible Study Coordinator"],["librarian","Librarian"]].map(([value,label]) => `<option value="${value}" ${editing.office === value ? "selected" : ""}>${label}</option>`).join("")}</select><div class="form-text">Required for executive accounts. The office controls editing permissions in restricted modules.</div></div></div><button class="btn btn-green" type="submit">${adminEditorUid ? "Save administrator" : "Grant administrator access"}</button>${adminEditorUid ? ` <button class="btn btn-light" type="button" id="cancelAdminEdit">Cancel</button>` : ""}<div id="adminFormFeedback" class="mt-3" aria-live="polite"></div></form></section><section class="panel"><div class="panel-title"><h3>Owner account</h3><span class="access-pill role-owner">Protected</span></div><div class="profile-card"><span class="profile-avatar">N</span><span><strong>Workspace owner</strong><small>${escapeHtml(currentUser.email || "")} · permanent access</small></span></div><p class="muted mt-3 mb-0">The original approved UID remains the owner and cannot be removed or downgraded from this screen.</p></section></div><section class="panel mt-3"><div class="panel-title"><h3>Dashboard administrators</h3><span class="muted">Access is enforced by Firebase rules</span></div><div id="adminDirectoryHost"></div></section>`;
}

function bindPasswordForm() {
  const form = document.getElementById("passwordForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = document.getElementById("passwordFeedback");
    const oldPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    if (newPassword.length < 8) { feedback.textContent = "Choose a password with at least 8 characters."; return; }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      form.reset();
      feedback.className = "mt-3 text-success small";
      feedback.textContent = "Password updated.";
      await logActivity("changed password", "account");
    } catch (error) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = error.code === "auth/wrong-password" || error.code === "auth/invalid-credential" ? "The current password could not be verified." : `Password update failed: ${error.message}`;
    }
  });
}

function bindAdminForm() {
  const form = document.getElementById("adminForm");
  const editingUid = adminEditorUid;
  document.getElementById("cancelAdminEdit")?.addEventListener("click", () => { adminEditorUid = ""; renderSettings("admins"); });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (currentUser.uid !== OWNER_UID) return toast("Only the owner can manage administrators.", "error");
    const uid = form.elements.uid.value.trim();
    const email = form.elements.email.value.trim();
    const name = form.elements.name.value.trim();
    const role = form.elements.role.value;
    const office = form.elements.office.value;
    const feedback = document.getElementById("adminFormFeedback");
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(uid)) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = "Enter the Firebase Auth UID from the existing account.";
      return;
    }
    if (role === "executive" && !office) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = "Select the executive office before granting access.";
      return;
    }
    if (role !== "executive" && office) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = "Clear the executive office when assigning a non-executive role.";
      return;
    }
    if (uid === OWNER_UID) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = "The owner account is already authorized and cannot be added as a delegated administrator.";
      return;
    }
    try {
      const prior = adminDirectory[uid] || {};
      await set(ref(database, `adminData/admins/${uid}`), { uid, email, name, role, ...(role === "executive" ? { office } : {}), active: prior.uid ? prior.active !== false : true, createdAt: prior.createdAt || Date.now(), createdBy: prior.createdBy || currentUser.uid, updatedAt: Date.now(), updatedBy: currentUser.uid });
      await logActivity(editingUid ? "updated administrator" : "granted administrator access", "administrators", uid);
      adminEditorUid = "";
      if (editingUid) renderSettings("admins");
      else {
        form.reset();
        feedback.className = "mt-3 text-success small";
        feedback.textContent = "Administrator access saved. The person must sign in with the matching Firebase Auth account.";
      }
      toast(`${role === "executive" ? "Executive" : role === "content" ? "Content editor" : "Administrator"} access saved.`);
    } catch (error) {
      feedback.className = "mt-3 text-danger small";
      feedback.textContent = `Could not save administrator access: ${error.message}`;
    }
  });
}

function renderAdminDirectory() {
  const host = document.getElementById("adminDirectoryHost");
  if (!host) return;
  if (moduleErrors.admins) {
    host.innerHTML = `<div class="notice danger">Could not read <code>adminData/admins</code>. Confirm the owner-only rules are active. ${escapeHtml(moduleErrors.admins)}</div>`;
    return;
  }
  const users = Object.entries(adminDirectory).filter(([uid, item]) => uid !== OWNER_UID && item && typeof item === "object").sort((a, b) => String(a[1].name || a[1].email).localeCompare(String(b[1].name || b[1].email)));
  if (!users.length) {
    host.innerHTML = `<div class="empty">No additional dashboard administrators have been added.</div>`;
    return;
  }
  host.innerHTML = `<div class="table-responsive"><table class="table"><thead><tr><th>Administrator</th><th>Firebase UID</th><th>Role</th><th>Access</th><th>Actions</th></tr></thead><tbody>${users.map(([uid, item]) => `<tr><td><strong>${escapeHtml(item.name || "Administrator")}</strong><div class="muted">${escapeHtml(item.email || "")}</div></td><td><code>${escapeHtml(uid)}</code></td><td><span class="badge-status ${item.role === "content" ? "private" : "role-admin"}">${item.role === "content" ? "Content editor" : item.role === "executive" ? `Executive · ${escapeHtml(item.office || "unassigned")}` : "Administrator"}</span></td><td><span class="badge-status ${item.active ? "role-admin" : "draft"}">${item.active ? "Active" : "Suspended"}</span></td><td class="text-nowrap"><button class="btn btn-sm btn-light" data-admin-edit="${escapeHtml(uid)}">Edit</button> <button class="btn btn-sm btn-light" data-admin-toggle="${escapeHtml(uid)}" data-next-active="${item.active ? "false" : "true"}">${item.active ? "Suspend" : "Reactivate"}</button> <button class="btn btn-sm btn-outline-danger" data-admin-remove="${escapeHtml(uid)}">Remove</button></td></tr>`).join("")}</tbody></table></div>`;
  host.querySelectorAll("[data-admin-edit]").forEach((button) => button.addEventListener("click", () => { adminEditorUid = button.dataset.adminEdit; renderSettings("admins"); }));
  host.querySelectorAll("[data-admin-toggle]").forEach((button) => button.addEventListener("click", () => setAdminActive(button.dataset.adminToggle, button.dataset.nextActive === "true")));
  host.querySelectorAll("[data-admin-remove]").forEach((button) => button.addEventListener("click", () => removeAdministrator(button.dataset.adminRemove)));
}

async function setAdminActive(uid, active) {
  if (currentUser.uid !== OWNER_UID) return toast("Only the owner can manage administrators.", "error");
  const action = active ? "reactivate" : "suspend";
  if (!window.confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} ${adminDirectory[uid]?.email || "this administrator"}?`)) return;
  try {
    await update(ref(database, `adminData/admins/${uid}`), { active, updatedAt: Date.now(), updatedBy: currentUser.uid });
    await logActivity(active ? "reactivated administrator" : "suspended administrator", "administrators", uid);
    toast(`Administrator ${active ? "reactivated" : "suspended"}.`);
  } catch (error) { toast(`Could not update administrator: ${error.message}`, "error"); }
}

async function removeAdministrator(uid) {
  if (currentUser.uid !== OWNER_UID || uid === OWNER_UID) return toast("The owner account cannot be removed.", "error");
  if (!window.confirm(`Remove dashboard access for ${adminDirectory[uid]?.email || uid}? Their Firebase Authentication account will not be deleted.`)) return;
  try {
    await remove(ref(database, `adminData/admins/${uid}`));
    await logActivity("removed administrator access", "administrators", uid);
    toast("Dashboard access removed. The Auth account remains unchanged.");
  } catch (error) { toast(`Could not remove administrator: ${error.message}`, "error"); }
}

function renderActivity() {
  const host = document.getElementById("settingsActivity");
  if (!host) return;
  const recent = activityEntries.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 25);
  host.innerHTML = recent.length
    ? recent.map((item) => `<div class="list-row"><strong>${escapeHtml(item.action || "updated")} · ${escapeHtml(item.module || "dashboard")}</strong><span class="muted">${escapeHtml(item.actorEmail || "Administrator")} · ${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString() : "")}</span></div>`).join("")
    : moduleErrors.activityLog ? `<div class="notice danger">Activity history is unavailable. Check the active-administrator read rule.</div>` : `<div class="empty">No dashboard changes have been recorded yet.</div>`;
}

onAuthStateChanged(auth, (user) => { void authorize(user); });
