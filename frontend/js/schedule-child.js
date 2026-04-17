const API = "http://localhost:3000/api";

// Get URL parameters
const getURLParameters = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        babyId: params.get("baby_id"),
        babyName: params.get("baby_name")
    };
};

// Show alert message
const showAlert = (message, type) => {
    const alertContainer = document.getElementById("alertContainer");
    const alert = document.createElement("div");
    alert.className = `alert ${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
};

// Fetch vaccination schedule for the child
const fetchChildVaccinationSchedule = async (babyId) => {
    try {
        const res = await fetch(`${API}/vaccines/schedule/${encodeURIComponent(babyId)}`);
        
        if (!res.ok) {
            const error = await res.json();
            showAlert(error.error || "Failed to fetch vaccination schedule", "error");
            return [];
        }

        const schedule = await res.json();
        return schedule;
    } catch (error) {
        showAlert("Error fetching vaccination schedule: " + error.message, "error");
        return [];
    }
};

// Mark vaccination as complete
const markVaccinationComplete = async (scheduleId, vaccineName) => {
    const confirmed = confirm(`Are you sure you want to mark "${vaccineName}" as complete?`);
    
    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(`${API}/reminders/complete-vaccination`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schedule_id: scheduleId
            })
        });

        if (!res.ok) {
            const error = await res.json();
            showAlert(error.error || "Failed to mark vaccination as complete", "error");
            return;
        }

        const result = await res.json();
        showAlert("Vaccination marked as complete successfully!", "success");

        // Refresh the schedule display after a short delay
        setTimeout(() => {
            const { babyId } = getURLParameters();
            displayVaccinationSchedule(babyId);
        }, 1000);

    } catch (error) {
        showAlert("Error marking vaccination as complete: " + error.message, "error");
    }
};

// Display vaccination schedule in two tables
const displayVaccinationSchedule = async (babyId) => {
    const schedule = await fetchChildVaccinationSchedule(babyId);

    if (schedule.length === 0) {
        document.getElementById("pendingTableBody").innerHTML = "";
        document.getElementById("pendingNoData").style.display = "block";
        document.getElementById("completedTableBody").innerHTML = "";
        document.getElementById("completedNoData").style.display = "block";
        return;
    }

    // Separate pending and completed vaccinations
    const pending = schedule.filter(item => item.status !== "Completed");
    const completed = schedule.filter(item => item.status === "Completed");

    // Display pending vaccinations
    const pendingTableBody = document.getElementById("pendingTableBody");
    const pendingNoData = document.getElementById("pendingNoData");

    if (pending.length === 0) {
        pendingTableBody.innerHTML = "";
        pendingNoData.style.display = "block";
    } else {
        pendingNoData.style.display = "none";
        pendingTableBody.innerHTML = pending.map(item => {
            const dueDate = new Date(item.due_date).toLocaleDateString();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const vaccDueDate = new Date(item.due_date);
            vaccDueDate.setHours(0, 0, 0, 0);
            const isEnabled = today >= vaccDueDate;
            
            return `
                <tr>
                    <td data-label="Vaccine"><a class="table-link" href="${getReminderLink(item.schedule_id)}" title="Open this vaccine in upcoming reminders">${escapeHtml(item.vaccine_name)}</a></td>
                    <td data-label="Due Date">${dueDate}</td>
                    <td data-label="Status">${item.status}</td>
                    <td data-label="Action">
                        <button type="button" class="complete-btn" onclick="markVaccinationComplete(${item.schedule_id}, ${escapeHtml(JSON.stringify(item.vaccine_name))})" ${isEnabled ? "" : "disabled"} title="${isEnabled ? "Mark as complete" : "Available after due date"}">
                            Mark Complete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Display completed vaccinations
    const completedTableBody = document.getElementById("completedTableBody");
    const completedNoData = document.getElementById("completedNoData");

    if (completed.length === 0) {
        completedTableBody.innerHTML = "";
        completedNoData.style.display = "block";
    } else {
        completedNoData.style.display = "none";
        completedTableBody.innerHTML = completed.map(item => {
            const dueDate = new Date(item.due_date).toLocaleDateString();
            return `
                <tr>
                    <td data-label="Vaccine"><a class="table-link" href="${getReminderLink(item.schedule_id)}" title="Open this vaccine in upcoming reminders">${escapeHtml(item.vaccine_name)}</a></td>
                    <td data-label="Due Date">${dueDate}</td>
                    <td data-label="Status">${item.status}</td>
                </tr>
            `;
        }).join("");
    }
};

const formatDate = (value) => {
    if (!value) {
        return "Unknown";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getReminderLink = (scheduleId) => {
    const { babyId, babyName } = getURLParameters();
    const params = new URLSearchParams({
        schedule_id: scheduleId,
        baby_id: babyId,
        baby_name: babyName || ""
    });

    return `upcoming-vaccinations.html?${params.toString()}`;
};

const fetchBabyDetails = async (babyId) => {
    const res = await fetch(`${API}/babies/${encodeURIComponent(babyId)}`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Failed to fetch baby details");
    }

    return data;
};

// Initialize page
window.addEventListener("DOMContentLoaded", async () => {
    const { babyId, babyName } = getURLParameters();

    if (!babyId || !babyName) {
        showAlert("Missing baby ID or name in URL parameters", "error");
        return;
    }

    document.getElementById("babyNameHeader").textContent = `Vaccination Schedule for ${decodeURIComponent(babyName)}`;

    try {
        const baby = await fetchBabyDetails(babyId);
        document.getElementById("babyNameHeader").textContent = `Vaccination Schedule for ${baby.baby_name}`;
        document.getElementById("babyMeta").textContent = `Date of birth: ${formatDate(baby.date_of_birth)}`;
    } catch (error) {
        document.getElementById("babyMeta").textContent = "Date of birth: Unavailable";
        showAlert(error.message, "error");
    }

    await displayVaccinationSchedule(babyId);
});
