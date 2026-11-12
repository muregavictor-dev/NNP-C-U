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

const ADMIN_UID = "lxg9a4sm2Sf92pzdjVhUWrQr6lx2";

const auth = window.nnpFirebase.auth;
const database = window.nnpFirebase.database;

const form = document.getElementById("announcementForm");
const list = document.getElementById("announcementsList");
const statusMessage = document.getElementById("statusMessage");
const publishButton = document.getElementById("publishButton");

// Protect the dashboard.
onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ADMIN_UID) {
        window.location.replace("login.html");
        return;
    }

    loadAnnouncements();
});

// Publish an announcement.
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user || user.uid !== ADMIN_UID) {
        statusMessage.textContent = "You are not authorized.";
        return;
    }

    const title = document.getElementById("announcementTitle").value.trim();
    const message = document.getElementById("announcementMessage").value.trim();
    const category = document.getElementById("announcementCategory").value;

    if (!title || !message) return;

    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";

    try {
        const announcementRef = push(ref(database, "announcements"));

        await set(announcementRef, {
            title,
            message,
            category,
            published: true,
            createdAt: Date.now(),
            createdBy: user.uid
        });

        form.reset();

        statusMessage.className = "mt-3 text-success";
        statusMessage.textContent = "Announcement published successfully!";

    } catch (error) {
        console.error(error);

        statusMessage.className = "mt-3 text-danger";
        statusMessage.textContent = "Publishing failed: " + error.message;

    } finally {
        publishButton.disabled = false;
        publishButton.textContent = "Publish Announcement";
    }
});

// Display announcements.
function loadAnnouncements() {
    const announcementsRef = ref(database, "announcements");

    onValue(announcementsRef, (snapshot) => {
        list.innerHTML = "";

        if (!snapshot.exists()) {
            list.textContent = "No announcements published yet.";
            return;
        }

        const announcements = Object.entries(snapshot.val())
            .sort((a, b) => b[1].createdAt - a[1].createdAt);

        announcements.forEach(([id, item]) => {
            const card = document.createElement("div");
            card.className = "border rounded p-3 mb-3";

            const title = document.createElement("h6");
            title.textContent = item.title;

            const category = document.createElement("small");
            category.className = "text-success";
            category.textContent = item.category;

            const message = document.createElement("p");
            message.className = "mt-2 mb-2";
            message.textContent = item.message;

            const date = document.createElement("small");
            date.className = "text-muted d-block mb-2";
            date.textContent = new Date(item.createdAt).toLocaleString();

            const deleteButton = document.createElement("button");
            deleteButton.className = "btn btn-sm btn-outline-danger";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async () => {
                if (!confirm("Delete this announcement?")) return;

                try {
                    await remove(ref(database, "announcements/" + id));
                } catch (error) {
                    alert("Could not delete: " + error.message);
                }
            });

            card.append(title, category, message, date, deleteButton);
            list.appendChild(card);
        });
    }, (error) => {
        console.error("Announcement loading error:", error);
        list.textContent = "Could not load announcements.";
    });
}

// Logout.
document.getElementById("logoutButton").addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
});