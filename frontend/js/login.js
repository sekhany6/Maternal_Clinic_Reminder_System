const API = "http://localhost:3000/api";
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const passwordToggleButtons = document.querySelectorAll(".password-toggle");

function validateEmailFormat(email) {
    const gmailRegex = /^[a-zA-Z0-9_-]+@gmail\.com$/;
    return gmailRegex.test(email);
}

function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
}

function showError(field, message) {
    if (field === "email") {
        emailError.textContent = message;
    } else if (field === "password") {
        passwordError.textContent = message;
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!email) {
            showError("email", "Email is required");
            emailInput.focus();
            return;
        }
        if (!validateEmailFormat(email)) {
            showError("email", "Email must be a valid Gmail address (e.g., user@gmail.com)");
            emailInput.focus();
            return;
        }
        if (!password) {
            showError("password", "Password is required");
            passwordInput.focus();
            return;
        }

        const data = { email, password };

        try {
            const res = await fetch(`${API}/staff/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                localStorage.setItem("staff", JSON.stringify(result));
                window.location.href = "dashboard.html";
            } else {
                // Handle specific error cases
                if (res.status === 404) {
                    showError("email", "No staff account found with that email. Please register first.");
                    emailInput.focus();
                } else if (res.status === 401) {
                    showError("password", "Incorrect password. Please try again.");
                    passwordInput.focus();
                } else if (res.status === 400) {
                    showError("email", result.error || "Please check your inputs.");
                } else {
                    showError("password", result.error || "Login failed. Please try again.");
                }
            }
        } catch (error) {
            console.error("Login error:", error);
            showError("password", "Connection error. Please check your internet and try again.");
        }
    });

    // Clear errors when user starts typing
    emailInput?.addEventListener("input", () => {
        emailError.textContent = "";
    });
    passwordInput?.addEventListener("input", () => {
        passwordError.textContent = "";
    });
}

passwordToggleButtons.forEach(button => {
    button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-password-target");
        const targetInput = document.getElementById(targetId);
        const wrapper = button.closest(".password-field");
        if (!targetInput || !wrapper) return;

        const isHidden = targetInput.type === "password";
        targetInput.type = isHidden ? "text" : "password";
        wrapper.classList.toggle("is-visible", isHidden);
        button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
});
