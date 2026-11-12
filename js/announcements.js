import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

console.log("NNP CU Announcements module loaded.");

const announcementsRef = ref(database, "announcements");

const container = document.getElementById("announcementsContainer");
const unreadCount = document.getElementById("unreadCount");
const notificationBadge = document.getElementById("notificationBadge");

const READ_KEY = "nnp-read-announcements";

function getReadAnnouncements() {
    try {
        return JSON.parse(localStorage.getItem(READ_KEY)) || [];
    } catch {
        return [];
    }
}

function markAsRead(id) {
    const readAnnouncements = getReadAnnouncements();

    if (!readAnnouncements.includes(id)) {
        readAnnouncements.push(id);
    }

    localStorage.setItem(READ_KEY, JSON.stringify(readAnnouncements));
}

function renderAnnouncements(announcements) {
    if (!container) {
        console.warn("Announcements container not found.");
        return;
    }

    container.replaceChildren();

    if (announcements.length === 0) {
        container.textContent = "There are no announcements yet.";
        return;
    }

    const readAnnouncements = getReadAnnouncements();

    let unread = 0;

    announcements.forEach((announcement) => {
        const isRead = readAnnouncements.includes(announcement.id);

        if (!isRead) unread++;

        const card = document.createElement("div");

        card.className =
            "alert alert-gold border-start border-4 border-deep-green p-3 rounded";

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
        date.textContent = announcement.createdAt
            ? new Date(announcement.createdAt).toLocaleString()
            : "";

        card.append(title, category, message, date);

        if (!isRead) {
            const button = document.createElement("button");

            button.className =
                "btn btn-sm btn-link p-0 text-deep-green";

            button.textContent = "Mark as Read";

            button.addEventListener("click", () => {
                markAsRead(announcement.id);
                renderAnnouncements(announcements);
            });

            card.appendChild(button);
        } else {
            const readLabel = document.createElement("small");
            readLabel.className = "text-muted";
            readLabel.textContent = "✓ Read";
            card.appendChild(readLabel);
        }

        container.appendChild(card);
    });

    if (unreadCount) {
        unreadCount.textContent = unread;
    }

    if (notificationBadge) {
        notificationBadge.classList.toggle("d-none", unread === 0);
        notificationBadge.textContent = unread;
    }
}

onValue(announcementsRef, (snapshot) => {
    const data = snapshot.val();

    const announcements = data
        ? Object.entries(data)
            .map(([id, announcement]) => ({
                id,
                ...announcement
            }))
            .filter(item => item.published === true)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [];

    console.log("Firebase announcements received:", announcements);

    renderAnnouncements(announcements);
});