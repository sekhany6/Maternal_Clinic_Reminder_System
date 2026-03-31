const API = "http://localhost:3000/api";
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const res = await fetch(`${API}/staff/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                alert("Login successful");
                localStorage.setItem("staff", JSON.stringify(result));
                window.location.href = "dashboard.html";
            } else {
                alert(result.message || "Login failed");
            }

        } catch (error) {
            alert("Error logging in");
        }
    });
}
