/* =========================================
   GLOBAL MARKET - LOGIN
   Uses the shared Appwrite client.
========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const loginButton = document.getElementById("loginButton");
    const loginMessage = document.getElementById("loginMessage");

    if (!form || !emailInput || !passwordInput || !loginButton || !loginMessage) {
        console.error("GLOBAL MARKET login form elements are missing.");
        return;
    }

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = "login-message " + type;
    }

    if (togglePassword) {
        togglePassword.addEventListener("click", function () {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            togglePassword.textContent = isHidden ? "Hide" : "Show";
        });
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        loginMessage.textContent = "";
        loginMessage.className = "login-message";

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Please enter your email address and password.", "error");
            return;
        }

        if (!window.GMAppwrite || !window.GMAppwrite.account) {
            showMessage("The sign-in service is not ready. Please refresh the page and try again.", "error");
            console.error("GMAppwrite account client is unavailable.");
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";

        try {
            await window.GMAppwrite.account.createEmailPasswordSession({
                email: email,
                password: password
            });

            showMessage("Sign-in successful. Opening your account...", "success");
            window.location.assign("profile.html");
        } catch (error) {
            console.error("GLOBAL MARKET sign-in failed:", error);

            if (error && (error.code === 401 || error.type === "user_invalid_credentials")) {
                showMessage("The email address or password is incorrect. Please check and try again.", "error");
            } else if (error && error.code === 429) {
                showMessage("Too many attempts. Please wait a little and try again.", "error");
            } else {
                showMessage("We could not sign you in right now. Please check your connection and try again.", "error");
            }
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
        }
    });
});
