const API = "http://localhost:3000/api";
const registerStaffForm = document.getElementById("registerStaffForm");

if (registerStaffForm) {
    registerStaffForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm_password").value;

        if (password !== confirmPassword) {
            return alert("Passwords do not match.");
        }

        const data = {
            staff_name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            password,
            role: document.getElementById("role").value,
            hospital_id: document.getElementById("hospital_id").value
        };

        try {
            const res = await fetch(`${API}/staff/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message || "Staff registered");
                window.location.href = "/dashboard.html";
            } else {
                alert(result.error || result.message || "Registration failed");
            }

        } catch (error) {
            alert("Error registering staff");
        }
    });
}
