(() => {
    const logoutApi = "http://localhost:3000/api";
    const logoutLinks = document.querySelectorAll(".logout-link");

    const handleLogout = async (event) => {
        event.preventDefault();

        try {
            await fetch(`${logoutApi}/staff/logout`, {
                method: "POST",
                credentials: "same-origin"
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("staff");
            window.location.href = "index.html";
        }
    };

    logoutLinks.forEach(link => {
        link.addEventListener("click", handleLogout);
    });
})();
