const API = "http://localhost:3000/api";
let currentBabyDetails = null;
let currentSchedule = [];

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
    currentSchedule = schedule;

    if (schedule.length === 0) {
        document.getElementById("pendingTableBody").innerHTML = "";
        document.getElementById("pendingNoData").classList.remove("hidden");
        document.getElementById("completedTableBody").innerHTML = "";
        document.getElementById("completedNoData").classList.remove("hidden");
        document.getElementById("printRecordsBtn").disabled = true;
        return;
    }

    document.getElementById("printRecordsBtn").disabled = false;

    // Separate pending and completed vaccinations
    const pending = schedule.filter(item => item.status !== "Completed");
    const completed = schedule.filter(item => item.status === "Completed");

    // Display pending vaccinations
    const pendingTableBody = document.getElementById("pendingTableBody");
    const pendingNoData = document.getElementById("pendingNoData");

    if (pending.length === 0) {
        pendingTableBody.innerHTML = "";
        pendingNoData.classList.remove("hidden");
    } else {
        pendingNoData.classList.add("hidden");
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
        completedNoData.classList.remove("hidden");
    } else {
        completedNoData.classList.add("hidden");
        completedTableBody.innerHTML = completed.map(item => {
            const dueDate = new Date(item.due_date).toLocaleDateString();
            const vaccinationDate = formatDate(item.vaccination_date || item.completed_date);
            return `
                <tr>
                    <td data-label="Vaccine"><a class="table-link" href="${getReminderLink(item.schedule_id)}" title="Open this vaccine in upcoming reminders">${escapeHtml(item.vaccine_name)}</a></td>
                    <td data-label="Due Date">${dueDate}</td>
                    <td data-label="Vaccination Date">${vaccinationDate}</td>
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

const renderMotherDetails = (baby) => {
    const detailsSection = document.getElementById("childFamilyDetails");
    if (!detailsSection) return;

    document.getElementById("motherNameDetail").textContent = baby.mother_name || "Mother";
    document.getElementById("motherPhoneDetail").innerHTML = `<strong>Phone:</strong> ${escapeHtml(baby.phone_no || "-")}`;
    document.getElementById("motherNationalIdDetail").innerHTML = `<strong>National ID:</strong> ${escapeHtml(baby.national_id || "-")}`;
    document.getElementById("hospitalNameDetail").textContent = baby.hospital_name || "Hospital";
    document.getElementById("hospitalLocationDetail").innerHTML = `<strong>Location:</strong> ${escapeHtml(baby.hospital_location || "-")}`;
    document.getElementById("hospitalContactDetail").innerHTML = `<strong>Contact:</strong> ${escapeHtml(baby.hospital_contact || "-")}`;
    detailsSection.classList.remove("hidden");
};

const buildPrintRows = (items) => {
    if (!items.length) {
        return `<tr><td colspan="4">No records found.</td></tr>`;
    }

    return items.map(item => `
        <tr>
            <td>${escapeHtml(item.vaccine_name)}</td>
            <td>${formatDate(item.due_date)}</td>
            <td>${formatDate(item.vaccination_date || item.completed_date)}</td>
            <td>${escapeHtml(item.status)}</td>
        </tr>
    `).join("");
};

const buildPrintableRecords = () => {
    const baby = currentBabyDetails || {};
    const pending = currentSchedule.filter(item => item.status !== "Completed");
    const completed = currentSchedule.filter(item => item.status === "Completed");

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Vaccination Records - ${escapeHtml(baby.baby_name || "Child")}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 32px; color: #1c3552; }
                h1, h2 { margin: 0 0 12px; }
                p { margin: 0 0 8px; line-height: 1.5; }
                .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0 24px; }
                .panel { border: 1px solid #d7e4f2; border-radius: 10px; padding: 14px; background: #f8fbff; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
                th, td { border: 1px solid #d7e4f2; padding: 8px; text-align: left; }
                th { background: #eef6ff; }
            </style>
        </head>
        <body>
            <h1>Child Vaccination Records</h1>
            <p><strong>Child:</strong> ${escapeHtml(baby.baby_name || "-")}</p>
            <p><strong>Date of birth:</strong> ${formatDate(baby.date_of_birth)}</p>
            <p><strong>Gender:</strong> ${escapeHtml(baby.gender || "-")}</p>

            <section class="meta">
                <div class="panel">
                    <h2>Mother Details</h2>
                    <p><strong>Name:</strong> ${escapeHtml(baby.mother_name || "-")}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(baby.phone_no || "-")}</p>
                    <p><strong>National ID:</strong> ${escapeHtml(baby.national_id || "-")}</p>
                </div>
                <div class="panel">
                    <h2>Hospital Details</h2>
                    <p><strong>Name:</strong> ${escapeHtml(baby.hospital_name || "-")}</p>
                    <p><strong>Location:</strong> ${escapeHtml(baby.hospital_location || "-")}</p>
                    <p><strong>Contact:</strong> ${escapeHtml(baby.hospital_contact || "-")}</p>
                </div>
            </section>

            <h2>Pending Vaccinations</h2>
            <table>
                <thead><tr><th>Vaccine</th><th>Due Date</th><th>Vaccination Date</th><th>Status</th></tr></thead>
                <tbody>${buildPrintRows(pending)}</tbody>
            </table>

            <h2>Completed Vaccinations</h2>
            <table>
                <thead><tr><th>Vaccine</th><th>Due Date</th><th>Vaccination Date</th><th>Status</th></tr></thead>
                <tbody>${buildPrintRows(completed)}</tbody>
            </table>
        </body>
        </html>
    `;
};

const printVaccinationRecords = () => {
    if (!currentSchedule.length) {
        showAlert("No vaccination records available to print.", "error");
        return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
        showAlert("Unable to open the print window. Please allow pop-ups and try again.", "error");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableRecords());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
        currentBabyDetails = baby;
        document.getElementById("babyNameHeader").textContent = `Vaccination Schedule for ${baby.baby_name}`;
        document.getElementById("babyMeta").textContent = `Date of birth: ${formatDate(baby.date_of_birth)}`;
        renderMotherDetails(baby);
    } catch (error) {
        document.getElementById("babyMeta").textContent = "Date of birth: Unavailable";
        showAlert(error.message, "error");
    }

    await displayVaccinationSchedule(babyId);
    document.getElementById("printRecordsBtn")?.addEventListener("click", printVaccinationRecords);
});
