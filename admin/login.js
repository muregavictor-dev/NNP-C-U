import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    loginMessage.textContent = "";

    try {
        const auth = window.nnpFirebase.auth;

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        // Only the designated administrator may proceed.
        if (userCredential.user.uid !== "lxg9a4sm2Sf92pzdjVhUWrQr6lx2") {
            await signOut(auth);

            throw new Error("You are not authorized to access this dashboard.");
        }

        loginMessage.className = "mt-3 small text-center text-success";
        loginMessage.textContent = "Login successful!";

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Admin login error:", error);

        loginMessage.className = "mt-3 small text-center text-danger";
        loginMessage.textContent = error.message;

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});