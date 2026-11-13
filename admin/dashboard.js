import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    ref,
    push,
    set,
    onValue,
    remove
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

/*
 * NNP CU MASTER ADMIN DASHBOARD
 * Existing Firebase project/configuration is reused.
 * Existing database path and announcement record structure are preserved.
 */

const ADMIN_UID = "lxg9a4sm2Sf92pzdjVhUWrQr6lx2";
const ANNOUNCEMENTS_PATH = "announcements";
const LOGIN_PAGE = "login.html";

const $ = (selector, root = document) => root.querySelector(selector);

function showFatalError(message) {
    const loading = $("#authLoading");
    const error = $("#authError");
    if (error) error.textContent = message;
    if (loading) {
        const paragraph = loading.querySelector("p");
        if (paragraph) paragraph.textContent = "The administration dashboard could not start.";
    }
    console.error(message);
}

/*
 * firebase-config.js is loaded before this module in dashboard.html.
 * It exposes the already initialized Firebase services on window.nnpFirebase.
 */
if (!window.nnpFirebase?.auth || !window.nnpFirebase?.database) {
    showFatalError("Firebase configuration was not found. Check ../js/firebase-config.js and reload.");
    throw new Error("window.nnpFirebase is not available.");
}

const auth = window.nnpFirebase.auth;
const database = window.nnpFirebase.database;

const MODULES = [
    { id: "overview", title: "Overview", group: "Main", icon: "speedometer2", status: "live", render: renderOverview },
    { id: "announcements", title: "Announcements", group: "Content", icon: "megaphone", status: "live", render: renderAnnouncements },

    { id: "events", title: "Events & Calendar", group: "Content", icon: "calendar-event", status: "planned",
      features: ["Create and edit events", "Publish event details", "Manage dates and venues", "View upcoming events", "Event registration"] },
    { id: "media", title: "Media & Resources", group: "Content", icon: "collection-play", status: "planned",
      features: ["Sermons and Bible study materials", "Photos and videos", "Documents and downloads", "Organise resources"] },

    { id: "membership", title: "Membership", group: "People", icon: "people", status: "planned",
      features: ["View membership applications", "View student information", "Approve or reject applications", "Manage member records", "Search, filter and export members"],
      note: "Member information is private. Secure database rules and a safe submission workflow must be implemented before member records are connected." },
    { id: "ministries", title: "Ministries", group: "People", icon: "diagram-3", status: "planned",
      features: ["Ministry departments", "Ministry coordinators", "Ministry membership", "Ministry activities and reports"] },
    { id: "prayer", title: "Prayer Requests", group: "People", icon: "heart", status: "planned",
      features: ["Receive and view requests", "Categorise requests", "Manage request status", "Protect confidential information"],
      note: "Prayer requests may contain sensitive personal information. Strict access controls must be designed before this module is connected." },

    { id: "attendance", title: "Attendance", group: "Operations", icon: "clipboard-check", status: "planned",
      features: ["Meeting and event attendance", "Attendance records", "Member attendance history", "Attendance reports"] },
    { id: "library", title: "Library", group: "Operations", icon: "book", status: "planned",
      features: ["Book catalogue", "Add and edit books", "Track borrowed and returned books", "Borrowing history", "Library reports"] },

    { id: "reports", title: "Reports & Analytics", group: "Insights", icon: "bar-chart", status: "planned",
      features: ["Membership statistics", "Attendance statistics", "Event participation", "Library and ministry activity", "General administration reports"] },
    { id: "settings", title: "Administration & Settings", group: "System", icon: "gear", status: "planned",
      features: ["Administrator profile", "Roles and permissions", "System settings", "Administrative activity logs"],
      note: "Future roles and permissions must be enforced by Firebase security rules, not merely hidden or shown by this interface." }
];

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = text;
    return node;
}

function toast(message, type = "success") {
    const container = $("#toasts");
    if (!container || !window.bootstrap?.Toast) {
        console[type === "danger" ? "error" : "log"](message);
        return;
    }

    const toastElement = el("div", `toast align-items-center text-bg-${type} border-0`);
    toastElement.setAttribute("role", type === "danger" ? "alert" : "status");

    const row = el("div", "d-flex");
    const body = el("div", "toast-body", message);
    const close = el("button", "btn-close btn-close-white me-2 m-auto");
    close.type = "button";
    close.setAttribute("data-bs-dismiss", "toast");
    close.setAttribute("aria-label", "Close");

    row.append(body, close);
    toastElement.append(row);
    container.append(toastElement);
    toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
    window.bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4500 }).show();
}

function confirmDialog(message) {
    return new Promise((resolve) => {
        const modalElement = $("#confirmModal");
        const okButton = $("#confirmOk");
        const text = $("#confirmText");

        if (!modalElement || !okButton || !window.bootstrap?.Modal) {
            resolve(window.confirm(message));
            return;
        }

        const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
        let confirmed = false;

        text.textContent = message;

        const onConfirm = () => {
            confirmed = true;
            modal.hide();
        };

        okButton.addEventListener("click", onConfirm);
        modalElement.addEventListener("hidden.bs.modal", () => {
            okButton.removeEventListener("click", onConfirm);
            resolve(confirmed);
        }, { once: true });

        modal.show();
    });
}

function formatDate(timestamp) {
    if (!timestamp) return "Date unknown";
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "Date unknown" : date.toLocaleString();
}

function setBadge(node, label, color = "secondary") {
    if (!node) return;
    node.textContent = label;
    node.className = `badge text-bg-${color}`;
}

/*
 * One announcements listener is shared by the Overview and Announcements
 * screens. It listens only to the existing "announcements" path.
 */
const Data = {
    items: [],
    loaded: false,
    error: null,
    connected: null,
    listeners: new Set(),
    unsubscribers: [],

    start() {
        if (this.unsubscribers.length) return;

        const announcementsListener = onValue(
            ref(database, ANNOUNCEMENTS_PATH),
            (snapshot) => {
                const value = snapshot.val() || {};
                this.items = Object.entries(value)
                    .map(([id, item]) => ({ ...item, id }))
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

                this.loaded = true;
                this.error = null;
                this.emit();
            },
            (error) => {
                console.error("Announcement loading error:", error);
                this.error = error;
                this.loaded = true;
                this.emit();
            }
        );

        const connectionListener = onValue(
            ref(database, ".info/connected"),
            (snapshot) => {
                this.connected = snapshot.val() === true;
                this.emit();
            },
            (error) => {
                console.warn("Firebase connection status unavailable:", error);
                this.connected = false;
                this.emit();
            }
        );

        this.unsubscribers.push(announcementsListener, connectionListener);
    },

    stop() {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        this.items = [];
        this.loaded = false;
        this.error = null;
        this.connected = null;
        this.emit();
    },

    subscribe(callback) {
        this.listeners.add(callback);
        callback();
        return () => this.listeners.delete(callback);
    },

    emit() {
        this.listeners.forEach((callback) => callback());
    },

    async publish({ title, message, category }, user) {
        const announcementRef = push(ref(database, ANNOUNCEMENTS_PATH));
        await set(announcementRef, {
            title,
            message,
            category,
            published: true,
            createdAt: Date.now(),
            createdBy: user.uid
        });
    },

    delete(id) {
        return remove(ref(database, `${ANNOUNCEMENTS_PATH}/${id}`));
    }
};

function renderOverview(view) {
    view.append($("#tpl-overview").content.cloneNode(true));

    const count = $('[data-stat="announcements"]', view);
    const recent = $('[data-slot="recent"]', view);
    const databaseBadge = $('[data-slot="db"]', view);
    const feedBadge = $('[data-slot="feed"]', view);

    return Data.subscribe(() => {
        recent.replaceChildren();

        if (Data.connected === true) setBadge(databaseBadge, "Connected", "success");
        else if (Data.connected === false) setBadge(databaseBadge, "Offline", "danger");
        else setBadge(databaseBadge, "Checking", "secondary");

        if (Data.error) {
            count.textContent = "Unavailable";
            setBadge(feedBadge, "Error", "danger");
            recent.append(el("div", "empty-state", "Could not load announcements. Check your Firebase connection and database rules."));
            return;
        }

        if (!Data.loaded) {
            count.textContent = "—";
            setBadge(feedBadge, "Loading", "secondary");
            recent.append(el("div", "empty-state", "Loading announcements…"));
            return;
        }

        count.textContent = String(Data.items.length);
        setBadge(feedBadge, "Live", "success");

        if (!Data.items.length) {
            recent.append(el("div", "empty-state", "No announcements have been published yet."));
            return;
        }

        Data.items.slice(0, 5).forEach((item) => {
            const row = el("div", "announcement-item");
            const top = el("div", "d-flex align-items-center justify-content-between gap-2 flex-wrap");
            top.append(
                el("h3", "announcement-title", item.title || "Untitled announcement"),
                el("span", `category-badge${item.category === "Urgent" ? " category-urgent" : ""}`, item.category || "General")
            );
            row.append(
                top,
                el("p", "announcement-message", item.message || ""),
                el("div", "announcement-meta", formatDate(item.createdAt))
            );
            recent.append(row);
        });
    });
}

function announcementCard(item) {
    const card = el("article", "announcement-item");
    const header = el("div", "d-flex align-items-start gap-2 flex-wrap");
    const title = el("h3", "announcement-title me-auto", item.title || "Untitled announcement");
    const category = el("span", `category-badge${item.category === "Urgent" ? " category-urgent" : ""}`, item.category || "General");

    const message = el("p", "announcement-message", item.message || "");
    const meta = el("div", "announcement-meta mb-3", formatDate(item.createdAt));
    const deleteButton = el("button", "btn btn-sm btn-outline-danger");
    deleteButton.type = "button";
    deleteButton.innerHTML = '<i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete';

    deleteButton.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user || user.uid !== ADMIN_UID) {
            toast("You are not authorised to delete announcements.", "danger");
            return;
        }

        const confirmed = await confirmDialog(`Delete "${item.title || "this announcement"}"? This action cannot be undone.`);
        if (!confirmed) return;

        deleteButton.disabled = true;
        try {
            await Data.delete(item.id);
            toast("Announcement deleted.");
        } catch (error) {
            console.error("Announcement deletion failed:", error);
            toast(`Could not delete announcement: ${error.message}`, "danger");
            deleteButton.disabled = false;
        }
    });

    header.append(title, category);
    card.append(header, message, meta, deleteButton);
    return card;
}

function renderAnnouncements(view) {
    view.append($("#tpl-announcements").content.cloneNode(true));

    const form = $("#announcementForm", view);
    const list = $("#announcementsList", view);
    const publishButton = $("#publishButton", view);
    const statusMessage = $("#statusMessage", view);
    const countBadge = $('[data-slot="announcement-count"]', view);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const user = auth.currentUser;
        if (!user || user.uid !== ADMIN_UID) {
            statusMessage.className = "small mt-3 text-danger";
            statusMessage.textContent = "You are not authorised to publish announcements.";
            return;
        }

        const title = $("#announcementTitle", view).value.trim();
        const message = $("#announcementMessage", view).value.trim();
        const category = $("#announcementCategory", view).value;

        if (!title || !message) {
            statusMessage.className = "small mt-3 text-danger";
            statusMessage.textContent = "Please provide both a title and a message.";
            return;
        }

        publishButton.disabled = true;
        publishButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Publishing…';
        statusMessage.textContent = "";

        try {
            await Data.publish({ title, message, category }, user);
            form.reset();
            statusMessage.className = "small mt-3 text-success";
            statusMessage.textContent = "Announcement published successfully.";
            toast("Announcement published successfully.");
        } catch (error) {
            console.error("Announcement publishing failed:", error);
            statusMessage.className = "small mt-3 text-danger";
            statusMessage.textContent = `Publishing failed: ${error.message}`;
            toast("Publishing failed. Check your connection and permissions.", "danger");
        } finally {
            publishButton.disabled = false;
            publishButton.innerHTML = '<i class="bi bi-send me-2"></i>Publish announcement';
        }
    });

    return Data.subscribe(() => {
        list.replaceChildren();

        if (Data.error) {
            list.append(el("div", "empty-state", "Could not load announcements. Check your Firebase connection and database rules."));
            setBadge(countBadge, "Unavailable", "danger");
            return;
        }

        if (!Data.loaded) {
            list.append(el("div", "empty-state", "Loading announcements…"));
            setBadge(countBadge, "Loading", "secondary");
            return;
        }

        setBadge(countBadge, `${Data.items.length} total`, "light");
        if (!Data.items.length) {
            list.append(el("div", "empty-state", "No announcements published yet."));
            return;
        }

        Data.items.forEach((item) => list.append(announcementCard(item)));
    });
}

function renderPlanned(view, module) {
    view.append($("#tpl-planned").content.cloneNode(true));
    $('[data-slot="icon"]', view).classList.add(`bi-${module.icon}`);
    $('[data-slot="title"]', view).textContent = module.title;

    const note = $('[data-slot="note"]', view);
    note.textContent = module.note || "This module is not connected to a database or workflow yet. Nothing here can currently be viewed, created or changed.";

    const features = $('[data-slot="features"]', view);
    module.features.forEach((feature) => features.append(el("li", "", feature)));
}

/* Hash-based navigation keeps the dashboard within one page. */
const Router = {
    cleanup: null,
    started: false,

    buildSidebar() {
        const nav = $("#sideNav");
        let currentGroup = "";

        MODULES.forEach((module) => {
            if (module.group !== currentGroup) {
                currentGroup = module.group;
                nav.append(el("div", "nav-group", currentGroup));
            }

            const link = el("a", "nav-link");
            link.href = `#${module.id}`;
            link.dataset.module = module.id;

            const icon = el("i", `bi bi-${module.icon}`);
            icon.setAttribute("aria-hidden", "true");

            link.append(icon, el("span", "", module.title));
            if (module.status === "planned") {
                link.append(el("span", "badge-planned", "Planned"));
            }
            nav.append(link);
        });

        nav.addEventListener("click", (event) => {
            if (event.target.closest(".nav-link") && window.bootstrap?.Offcanvas) {
                const sidebar = $("#sidebar");
                window.bootstrap.Offcanvas.getInstance(sidebar)?.hide();
            }
        });
    },

    render() {
        const requestedId = window.location.hash.slice(1);
        const module = MODULES.find((item) => item.id === requestedId) || MODULES[0];
        const view = $("#view");

        if (this.cleanup) {
            this.cleanup();
            this.cleanup = null;
        }

        view.replaceChildren();

        document.querySelectorAll("#sideNav .nav-link").forEach((link) => {
            const active = link.dataset.module === module.id;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });

        $("#pageTitle").textContent = module.title;
        document.title = `${module.title} | NNP CU Admin`;

        const cleanup = module.status === "live"
            ? module.render(view)
            : renderPlanned(view, module);

        this.cleanup = typeof cleanup === "function" ? cleanup : null;
        view.focus({ preventScroll: true });
    },

    start() {
        if (this.started) return;
        this.started = true;
        window.addEventListener("hashchange", () => this.render());
        this.render();
    }
};

/* Authentication gate: only the existing approved UID may enter. */
const Auth = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        onAuthStateChanged(auth, async (user) => {
            if (user && user.uid === ADMIN_UID) {
                $("#adminLabel").textContent = user.email || "Administrator";
                $("#authLoading").classList.add("d-none");
                $("#app").classList.remove("d-none");

                Data.start();
                Router.buildSidebar();
                Router.start();
                return;
            }

            Data.stop();

            if (user) {
                await signOut(auth).catch((error) => console.error("Could not sign out unauthorised user:", error));
            }

            window.location.replace(LOGIN_PAGE);
        });

        $("#logoutButton").addEventListener("click", async () => {
            const button = $("#logoutButton");
            button.disabled = true;

            try {
                await signOut(auth);
                window.location.replace(LOGIN_PAGE);
            } catch (error) {
                console.error("Logout failed:", error);
                toast(`Could not log out: ${error.message}`, "danger");
                button.disabled = false;
            }
        });
    }
};

Auth.init();
