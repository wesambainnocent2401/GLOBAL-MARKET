
/* =========================================
   GLOBAL MARKET - USER REGISTRATION
   Appwrite Authentication + Profiles
========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("registerForm");
    const button = document.getElementById("registerButton");
    const message = document.getElementById("formMessage");

    if (!form || !button || !message) {
        console.error("Registration form elements are missing.");
        return;
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = "form-message " + type;
    }

    // Password visibility controls
    document.querySelectorAll(".password-toggle").forEach(function (toggle) {

        toggle.addEventListener("click", function () {

            const input = document.getElementById(toggle.dataset.target);

            if (!input) return;

            const hidden = input.type === "password";

            input.type = hidden ? "text" : "password";
            toggle.textContent = hidden ? "Hide" : "Show";

        });

    });

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        message.textContent = "";
        message.className = "form-message";

        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const county = document.getElementById("county").value;
        const accountType = document.getElementById("accountType").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const agreeTerms = document.getElementById("agreeTerms").checked;

        if (!firstName || !lastName || !email || !phone || !accountType) {
            showMessage("Please complete all required fields.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage("Your password must contain at least 8 characters.", "error");
            return;
        }

        if (password.length > 72) {
            showMessage("Your password is too long.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Your passwords do not match.", "error");
            return;
        }

        if (!agreeTerms) {
            showMessage("Please agree to the Terms and Conditions.", "error");
            return;
        }

        if (!window.GMAppwrite || !window.GMAppwrite.account ||
            !window.GMAppwrite.tablesDB || !window.Appwrite) {

            showMessage(
                "The registration service is not ready. Please refresh the page.",
                "error"
            );

            return;
        }

        button.disabled = true;
        button.textContent = "Creating your account...";

        let accountCreated = false;

        try {

            const fullName = firstName + " " + lastName;

            // 1. Create the Appwrite account
            const user = await window.GMAppwrite.account.create({
                userId: window.GMAppwrite.ID.unique(),
                email: email,
                password: password,
                name: fullName
            });

            accountCreated = true;

            // 2. Create a session so the user can create their profile row
            await window.GMAppwrite.account.createEmailPasswordSession({
                email: email,
                password: password
            });

            // 3. Save the user's profile
            await window.GMAppwrite.tablesDB.createRow({
                databaseId: "global_market_db",
                tableId: "profiles",
                rowId: user.$id,

                data: {
                    userId: user.$id,
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    accountType: accountType,
                    county: county || null
                },

                permissions: [
                    window.Appwrite.Permission.read(
                        window.Appwrite.Role.user(user.$id)
                    ),
                    window.Appwrite.Permission.update(
                        window.Appwrite.Role.user(user.$id)
                    ),
                    window.Appwrite.Permission.delete(
                        window.Appwrite.Role.user(user.$id)
                    )
                ]
            });

            showMessage(
                "Your GLOBAL MARKET account has been created successfully! Redirecting to sign in...",
                "success"
            );

            form.reset();

            setTimeout(function () {
                window.location.href = "login.html";
            }, 2500);

        } catch (error) {

            console.error("GLOBAL MARKET registration error:", error);

            if (accountCreated) {

                showMessage(
                    "Your account was created, but we could not save your profile. Please contact support before trying to register again.",
                    "error"
                );

            } else if (error && error.code === 409) {

                showMessage(
                    "This email address is already registered. Please sign in instead.",
                    "error"
                );

            } else if (error && error.code === 429) {

                showMessage(
                    "Too many attempts. Please wait a little and try again.",
                    "error"
                );

            } else {

                showMessage(
                    error && error.message
                        ? "Registration failed: " + error.message
                        : "Registration failed. Please check your connection and try again.",
                    "error"
                );

            }

        } finally {

            button.disabled = false;
            button.textContent = "Create My Account →";

        }

    });

});
