
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const OWNER_UID = "lxg9a4sm2Sf92pzdjVhUWrQr6lx2";
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";
  loginMessage.textContent = "";

  try {
    const { auth, database } = window.nnpFirebase;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    let allowed = user.uid === OWNER_UID;

    if (!allowed) {
      const snapshot = await get(ref(database, `adminData/admins/${user.uid}`));
      const profile = snapshot.val();
      allowed =
        profile?.active === true &&
        ["admin", "content", "executive"].includes(profile.role) &&
        profile.email?.toLowerCase() === user.email?.toLowerCase() &&
        (
          profile.role !== "executive" ||
          (typeof profile.office === "string" && profile.office.trim() !== "")
        );
    }

    if (!allowed) {
      await signOut(auth);
      throw new Error("This account does not have active dashboard access. Contact the workspace owner.");
    }

    loginMessage.className = "mt-3 small text-center text-success";
    loginMessage.textContent = "Login successful.";
    window.location.replace("dashboard.html");
  } catch (error) {
    console.error("Admin login error:", error);
    if (window.nnpFirebase?.auth?.currentUser) await signOut(window.nnpFirebase.auth);
    const code = String(error.code || "").toLowerCase();
    loginMessage.className = "mt-3 small text-center text-danger";
    loginMessage.textContent = code.includes("permission_denied") || code.includes("permission-denied")
      ? "Administrator access could not be checked. Confirm the current database rules, then try again."
      : error.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
