const API = "http://localhost:3000/api";
const registerStaffForm = document.getElementById("registerStaffForm");
const passwordToggleButtons = document.querySelectorAll(".password-toggle");

// Password Validation
const validatePassword = (password) => {
    const errors = [];
    
    if (password.length !== 8) {
        errors.push("Password must be exactly 8 characters long");
    }
    
    if (!/\d/.test(password)) {
        errors.push("Password must include at least one digit (0-9)");
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must include at least one capital letter (A-Z)");
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must include at least one special character (!@#$%^&*)");
    }
    
    return errors;
};

// Email Validation
const validateEmailFormat = (email) => {
    const gmailRegex = /^[a-zA-Z0-9_-]+@gmail\.com$/;
    return gmailRegex.test(email);
};

// Clear error messages
const clearErrors = () => {
    const errorElements = document.querySelectorAll(".error");
    errorElements.forEach(el => el.textContent = "");
};

if (registerStaffForm) {
    registerStaffForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm_password").value;
        const role = document.getElementById("role").value;
        const hospitalId = document.getElementById("hospital_id").value;

        // Validate email
        if (!validateEmailFormat(email)) {
            document.getElementById("emailError").textContent = "Email must be a valid Gmail address (user@gmail.com)";
            return;
        }

        // Validate password
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            document.getElementById("passwordError").innerHTML = passwordErrors.map(err => `${err}<br>`).join("");
            return;
        }

        if (password !== confirmPassword) {
            document.getElementById("passwordError").textContent = "Passwords do not match";
            return;
        }

        const data = {
            staff_name: name,
            email,
            password,
            role,
            hospital_id: hospitalId
        };

        try {
            const res = await fetch(`${API}/staff/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message || "Staff registered successfully");
                window.location.href = "/login.html";
            } else {
                alert(result.error || result.message || "Registration failed");
            }

        } catch (error) {
            alert("Error registering staff: " + error.message);
        }
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
