console.log("NNP CU Announcements module loaded.");

const announcementsContainer = document.getElementById("announcementsContainer");
const readKey = "nnp-read-announcements";
const requestTimeoutMs = 15000;
const sessionReadIds = new Set();

let currentAnnouncements = [];
let receivedInitialData = false;
let unsubscribe = null;
let requestTimeout = null;
let activeAttempt = 0;

function readStoredIds() {
  try {
    const value = JSON.parse(localStorage.getItem(readKey));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function isAnnouncementRead(id, storedIds) {
  return sessionReadIds.has(id) || storedIds.includes(id);
}

function getTimestamp(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return Date.parse(value) || 0;
}

function updateUnreadCounters(unread) {
  const unreadCount = document.getElementById("unreadCount");
  const notificationBadge = document.getElementById("notificationBadge");

  if (unreadCount) {
    unreadCount.textContent = String(unread);
  }

  if (notificationBadge) {
    notificationBadge.textContent = String(unread);
    notificationBadge.classList.toggle("d-none", unread === 0);
    notificationBadge.hidden = unread === 0;
  }
}

function showStatus(message, { canRetry = false, isError = false } = {}) {
  if (!announcementsContainer) return;

  const status = document.createElement("p");
  status.className = isError
    ? "text-danger small text-center"
    : "text-muted small text-center";
  status.setAttribute("role", isError ? "alert" : "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = message;
  announcementsContainer.replaceChildren(status);

  if (!canRetry) return;

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn btn-sm btn-outline-success d-block mx-auto mt-2 announcement-retry-btn";
  retry.textContent = "Try again";
  retry.addEventListener("click", () => {
    retry.disabled = true;
    startAnnouncements();
  });
  announcementsContainer.appendChild(retry);
}

function markAsRead(id) {
  sessionReadIds.add(id);
  const storedIds = readStoredIds();
  if (!storedIds.includes(id)) storedIds.push(id);

  try {
    localStorage.setItem(readKey, JSON.stringify(storedIds));
  } catch (error) {
    // The current page session still remembers the read state when storage is unavailable.
    console.warn("Could not save announcement read state on this device.", error);
  }
}

function renderAnnouncements(announcements) {
  if (!announcementsContainer) {
    console.warn("Announcements container not found.");
    return;
  }

  announcementsContainer.replaceChildren();

  if (announcements.length === 0) {
    announcementsContainer.textContent = "There are no announcements yet.";
    updateUnreadCounters(0);
    return;
  }

  const storedIds = readStoredIds();
  let unread = 0;

  announcements.forEach((announcement) => {
    const isRead = isAnnouncementRead(announcement.id, storedIds);
    if (!isRead) unread++;

    const card = document.createElement("div");
    card.className = "alert alert-gold border-start border-4 border-deep-green p-3 rounded";

    const title = document.createElement("h6");
    title.className = "alert-heading fw-bold";
    title.textContent = announcement.title || "Announcement";

    const category = document.createElement("small");
    category.className = "text-muted d-block mb-2";
    category.textContent = announcement.category || "General";

    const message = document.createElement("p");
    message.className = "mb-2 small";
    message.textContent = announcement.message || "";

    const date = document.createElement("small");
    date.className = "text-muted d-block mb-2";
    const timestamp = getTimestamp(announcement.createdAt);
    date.textContent = Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp).toLocaleString()
      : "";

    card.append(title, category, message, date);

    if (!isRead) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-sm btn-link px-2 py-2 text-deep-green announcement-read-btn";
      button.textContent = "Mark as Read";
      button.addEventListener("click", () => {
        markAsRead(announcement.id);
        renderAnnouncements(currentAnnouncements);
      });
      card.appendChild(button);
    } else {
      const readLabel = document.createElement("small");
      readLabel.className = "text-muted";
      readLabel.textContent = "✓ Read";
      card.appendChild(readLabel);
    }

    announcementsContainer.appendChild(card);
  });

  updateUnreadCounters(unread);
}

function parseAnnouncements(snapshot) {
  const data = snapshot.val();
  if (!data || typeof data !== "object") return [];

  return Object.entries(data)
    .filter(([, announcement]) => announcement && typeof announcement === "object")
    .map(([id, announcement]) => ({ id, ...announcement }))
    .filter((announcement) => announcement.published === true)
    .sort((a, b) => {
      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
}

function showLoadError(message, attempt, error) {
  if (attempt !== activeAttempt) return;
  clearTimeout(requestTimeout);
  requestTimeout = null;
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  console.error("Unable to load Firebase announcements:", error || message);
  showStatus(message, { canRetry: true, isError: true });
}

async function startAnnouncements() {
  if (!announcementsContainer) {
    console.warn("Announcements container not found.");
    return;
  }

  const attempt = ++activeAttempt;
  receivedInitialData = false;
  clearTimeout(requestTimeout);
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  showStatus("Loading announcements…");

  try {
    // Dynamic imports let the page show a useful retry state if Firebase's CDN or
    // configuration module is unavailable instead of leaving the loading message forever.
    const [{ database }, { ref, onValue }] = await Promise.all([
      import("./firebase-config.js"),
      import("https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js")
    ]);

    if (attempt !== activeAttempt) return;

    unsubscribe = onValue(
      ref(database, "announcements"),
      (snapshot) => {
        if (attempt !== activeAttempt) return;
        clearTimeout(requestTimeout);
        requestTimeout = null;
        receivedInitialData = true;
        currentAnnouncements = parseAnnouncements(snapshot);
        console.log("Firebase announcements received:", currentAnnouncements);
        renderAnnouncements(currentAnnouncements);
      },
      (error) => {
        showLoadError(
          "Announcements could not be loaded. Check your connection and try again.",
          attempt,
          error
        );
      }
    );

    requestTimeout = window.setTimeout(() => {
      if (attempt !== activeAttempt || receivedInitialData) return;
      showStatus("Announcements are taking longer to load. Check your connection and try again.", {
        canRetry: true,
        isError: true
      });
    }, requestTimeoutMs);
  } catch (error) {
    showLoadError(
      "Announcements could not be loaded. Check your connection and try again.",
      attempt,
      error
    );
  }
}

window.addEventListener("nnp:header-loaded", () => {
  if (receivedInitialData) renderAnnouncements(currentAnnouncements);
});

startAnnouncements();
