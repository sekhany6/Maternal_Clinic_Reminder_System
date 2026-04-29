const API = "http://localhost:3000/api";
const reportForm = document.getElementById("hospitalReportForm");
const reportMonthInput = document.getElementById("reportMonth");
const reportMonthLabel = document.getElementById("reportMonthLabel");
const reportAlert = document.getElementById("reportAlert");
const reportSummary = document.getElementById("reportSummary");
const reportTable = document.getElementById("hospitalReportTable");
const reportEmpty = document.getElementById("hospitalReportEmpty");
const detailRecords = document.getElementById("hospitalDetailRecords");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const summaryHospitals = document.getElementById("summaryHospitals");
const summaryStaff = document.getElementById("summaryStaff");
const summaryMothers = document.getElementById("summaryMothers");
const summaryChildren = document.getElementById("summaryChildren");
const summaryCompleted = document.getElementById("summaryCompleted");
const summaryPending = document.getElementById("summaryPending");

let latestReport = null;

const setDefaultMonth = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    reportMonthInput.value = `${today.getFullYear()}-${month}`;
};

const showAlert = (message, type) => {
    reportAlert.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
};

const clearAlert = () => {
    reportAlert.innerHTML = "";
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const renderSummary = (summary) => {
    summaryHospitals.textContent = summary.hospitals;
    summaryStaff.textContent = summary.staff;
    summaryMothers.textContent = summary.mothers;
    summaryChildren.textContent = summary.children;
    summaryCompleted.textContent = summary.completedVaccinations;
    summaryPending.textContent = summary.pendingVaccinations;
    reportSummary.classList.remove("hidden");
};

const renderTable = (records) => {
    reportTable.innerHTML = "";

    if (!records.length) {
        reportEmpty.classList.remove("hidden");
        return;
    }

    reportEmpty.classList.add("hidden");
    records.forEach((record) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td data-label="Hospital">${escapeHtml(record.hospital_name)}</td>
            <td data-label="Location">${escapeHtml(record.location || "-")}</td>
            <td data-label="Contact">${escapeHtml(record.contact || "-")}</td>
            <td data-label="Staff">${record.staff_count}</td>
            <td data-label="Mothers">${record.mother_count}</td>
            <td data-label="Children">${record.child_count}</td>
            <td data-label="Completed Vaccinations">${record.completed_vaccinations}</td>
            <td data-label="Pending Vaccinations">${record.pending_vaccinations}</td>
        `;
        reportTable.appendChild(row);
    });
};

const buildStaffMarkup = (staffMembers) => {
    if (!staffMembers.length) {
        return `<div class="empty-state compact-empty"><strong>No staff recorded.</strong></div>`;
    }

    return `
        <div class="detail-chip-list">
            ${staffMembers.map((staff) => `
                <span class="detail-chip">
                    ${escapeHtml(staff.staff_name)}
                    <strong>${escapeHtml(staff.role || "Role not set")}</strong>
                </span>
            `).join("")}
        </div>
    `;
};

const buildMotherRows = (mothers) => {
    if (!mothers.length) {
        return `
            <tr>
                <td colspan="5">No mothers registered for this hospital.</td>
            </tr>
        `;
    }

    return mothers.map((mother) => `
        <tr>
            <td data-label="Mother">${escapeHtml(mother.mother_name)}</td>
            <td data-label="Phone">${escapeHtml(mother.phone_no || "-")}</td>
            <td data-label="Children">${mother.child_count}</td>
            <td data-label="Child Details">
                ${mother.children.length
                    ? mother.children.map((child) => `
                        <div class="detail-list-entry">
                            <strong>${escapeHtml(child.baby_name || "Unnamed child")}</strong>
                            <span>${formatDate(child.date_of_birth)}</span>
                        </div>
                    `).join("")
                    : `<span>-</span>`
                }
            </td>
        </tr>
    `).join("");
};

const buildVaccinationRows = (vaccinations) => {
    if (!vaccinations.length) {
        return `
            <tr>
                <td colspan="7">No vaccination activity found for this month.</td>
            </tr>
        `;
    }

    return vaccinations.map((item) => `
        <tr>
            <td data-label="Mother">${escapeHtml(item.mother_name)}</td>
            <td data-label="Child">${escapeHtml(item.baby_name)}</td>
            <td data-label="Date of Birth">${formatDate(item.date_of_birth)}</td>
            <td data-label="Vaccine">${escapeHtml(item.vaccine_name)}</td>
            <td data-label="Due Date">${formatDate(item.due_date)}</td>
            <td data-label="Vaccination Date">${formatDate(item.vaccination_date)}</td>
            <td data-label="Status"><span class="report-status ${item.status === "Completed" ? "is-complete" : "is-pending"}">${escapeHtml(item.status)}</span></td>
        </tr>
    `).join("");
};

const renderDetails = (records) => {
    detailRecords.innerHTML = "";

    if (!records.length) {
        return;
    }

    records.forEach((record) => {
        const section = document.createElement("section");
        section.className = "table-card hospital-detail-card";
        section.innerHTML = `
            <div class="section-heading">
                <div>
                    <h2>${escapeHtml(record.hospital_name)}</h2>
                    <p>${escapeHtml(record.location || "Location not provided")} | ${escapeHtml(record.contact || "Contact not provided")}</p>
                </div>
                <div class="detail-metrics">
                    <span class="pill pill-blue">Staff ${record.staff_count}</span>
                    <span class="pill pill-green">Completed ${record.completed_vaccinations}</span>
                    <span class="pill pill-gold">Pending ${record.pending_vaccinations}</span>
                </div>
            </div>

            <div class="detail-grid">
                <article class="detail-panel">
                    <div class="detail-panel-header">
                        <h3>Staff members</h3>
                        <p>Names and roles linked to this hospital.</p>
                    </div>
                    ${buildStaffMarkup(record.staff_members)}
                </article>

                <article class="detail-panel">
                    <div class="detail-panel-header">
                        <h3>Families summary</h3>
                        <p>${record.mother_count} mothers and ${record.child_count} children registered.</p>
                    </div>
                    <div class="detail-stats">
                        <div class="detail-stat">
                            <span>Mothers</span>
                            <strong>${record.mother_count}</strong>
                        </div>
                        <div class="detail-stat">
                            <span>Children</span>
                            <strong>${record.child_count}</strong>
                        </div>
                    </div>
                </article>
            </div>

            <div class="detail-panel">
                <div class="detail-panel-header">
                    <h3>Mothers and registered children</h3>
                    <p>Each mother with child count, names, and dates of birth.</p>
                </div>
                <div class="table-responsive">
                    <table class="vaccination-table">
                        <thead>
                            <tr>
                                <th>Mother</th>
                                <th>Phone</th>
                                <th>Children</th>
                                <th>Child Details</th>
                            </tr>
                        </thead>
                        <tbody>${buildMotherRows(record.mothers)}</tbody>
                    </table>
                </div>
            </div>

            <div class="detail-panel">
                <div class="detail-panel-header">
                    <h3>Vaccination activity for ${escapeHtml(latestReport.monthLabel)}</h3>
                    <p>Completed and pending vaccinations for the selected month.</p>
                </div>
                <div class="table-responsive">
                    <table class="vaccination-table">
                        <thead>
                            <tr>
                                <th>Mother</th>
                                <th>Child</th>
                                <th>Date of Birth</th>
                                <th>Vaccine</th>
                                <th>Due Date</th>
                                <th>Vaccination Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${buildVaccinationRows(record.vaccinations)}</tbody>
                    </table>
                </div>
            </div>
        `;

        detailRecords.appendChild(section);
    });
};

const loadReport = async () => {
    clearAlert();
    downloadPdfBtn.disabled = true;

    try {
        const res = await fetch(`${API}/hospitals/monthly-records?month=${encodeURIComponent(reportMonthInput.value)}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed to load hospital records.");
        }

        latestReport = data;
        reportMonthLabel.textContent = data.monthLabel;
        renderSummary(data.summary);
        renderTable(data.records);
        renderDetails(data.records);
        downloadPdfBtn.disabled = data.records.length === 0;
    } catch (error) {
        latestReport = null;
        reportSummary.classList.add("hidden");
        reportTable.innerHTML = "";
        detailRecords.innerHTML = "";
        reportEmpty.classList.remove("hidden");
        showAlert(error.message, "error");
    }
};

const buildPrintableReport = () => {
    if (!latestReport) return "";

    const overviewRows = latestReport.records.map((record) => `
        <tr>
            <td>${escapeHtml(record.hospital_name)}</td>
            <td>${escapeHtml(record.location || "-")}</td>
            <td>${escapeHtml(record.contact || "-")}</td>
            <td>${record.staff_count}</td>
            <td>${record.mother_count}</td>
            <td>${record.child_count}</td>
            <td>${record.completed_vaccinations}</td>
            <td>${record.pending_vaccinations}</td>
        </tr>
    `).join("");

    const detailSections = latestReport.records.map((record) => `
        <section class="hospital-section">
            <h2>${escapeHtml(record.hospital_name)}</h2>
            <p><strong>Location:</strong> ${escapeHtml(record.location || "-")} | <strong>Contact:</strong> ${escapeHtml(record.contact || "-")}</p>
            <p><strong>Staff:</strong> ${record.staff_members.length ? record.staff_members.map((staff) => `${escapeHtml(staff.staff_name)} (${escapeHtml(staff.role || "Role not set")})`).join(", ") : "No staff recorded."}</p>
            <p><strong>Mothers:</strong> ${record.mother_count} | <strong>Children:</strong> ${record.child_count} | <strong>Completed:</strong> ${record.completed_vaccinations} | <strong>Pending:</strong> ${record.pending_vaccinations}</p>

            <h3>Mothers and Children</h3>
            <table>
                <thead>
                    <tr>
                        <th>Mother</th>
                        <th>Phone</th>
                        <th>Children</th>
                        <th>Child Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${record.mothers.length ? record.mothers.map((mother) => `
                        <tr>
                            <td>${escapeHtml(mother.mother_name)}</td>
                            <td>${escapeHtml(mother.phone_no || "-")}</td>
                            <td>${mother.child_count}</td>
                            <td>${mother.children.length ? mother.children.map((child) => `${escapeHtml(child.baby_name || "Unnamed child")} (${formatDate(child.date_of_birth)})`).join(", ") : "-"}</td>
                        </tr>
                    `).join("") : `
                        <tr><td colspan="5">No mothers registered for this hospital.</td></tr>
                    `}
                </tbody>
            </table>

            <h3>Vaccination Activity</h3>
            <table>
                <thead>
                    <tr>
                        <th>Mother</th>
                        <th>Child</th>
                        <th>Date of Birth</th>
                        <th>Vaccine</th>
                        <th>Due Date</th>
                        <th>Vaccination Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${record.vaccinations.length ? record.vaccinations.map((item) => `
                        <tr>
                            <td>${escapeHtml(item.mother_name)}</td>
                            <td>${escapeHtml(item.baby_name)}</td>
                            <td>${formatDate(item.date_of_birth)}</td>
                            <td>${escapeHtml(item.vaccine_name)}</td>
                            <td>${formatDate(item.due_date)}</td>
                            <td>${formatDate(item.vaccination_date)}</td>
                            <td>${escapeHtml(item.status)}</td>
                        </tr>
                    `).join("") : `
                        <tr><td colspan="7">No vaccination activity found for this month.</td></tr>
                    `}
                </tbody>
            </table>
        </section>
    `).join("");

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hospital Records ${escapeHtml(latestReport.monthLabel)}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 32px; color: #1c3552; }
                h1, h2, h3 { margin: 0 0 12px; }
                p { margin: 0 0 10px; line-height: 1.5; }
                .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 24px 0; }
                .summary-card { border: 1px solid #cfe0f2; border-radius: 12px; padding: 12px; background: #f8fbff; }
                .summary-label { font-size: 12px; text-transform: uppercase; color: #5f7ea2; margin-bottom: 6px; }
                .summary-value { font-size: 24px; font-weight: bold; }
                .hospital-section { margin-top: 28px; page-break-inside: avoid; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th, td { border: 1px solid #d7e4f2; padding: 8px; text-align: left; vertical-align: top; }
                th { background: #eef6ff; }
            </style>
        </head>
        <body>
            <h1>Monthly Hospital Records</h1>
            <p><strong>Month:</strong> ${escapeHtml(latestReport.monthLabel)}</p>
            <p>Maternal Clinic Reminder System</p>

            <section class="summary">
                <div class="summary-card"><div class="summary-label">Hospitals</div><div class="summary-value">${latestReport.summary.hospitals}</div></div>
                <div class="summary-card"><div class="summary-label">Staff</div><div class="summary-value">${latestReport.summary.staff}</div></div>
                <div class="summary-card"><div class="summary-label">Mothers</div><div class="summary-value">${latestReport.summary.mothers}</div></div>
                <div class="summary-card"><div class="summary-label">Children</div><div class="summary-value">${latestReport.summary.children}</div></div>
                <div class="summary-card"><div class="summary-label">Completed</div><div class="summary-value">${latestReport.summary.completedVaccinations}</div></div>
                <div class="summary-card"><div class="summary-label">Pending</div><div class="summary-value">${latestReport.summary.pendingVaccinations}</div></div>
            </section>

            <h2>Hospital Overview</h2>
            <table>
                <thead>
                    <tr>
                        <th>Hospital</th>
                        <th>Location</th>
                        <th>Contact</th>
                        <th>Staff</th>
                        <th>Mothers</th>
                        <th>Children</th>
                        <th>Completed</th>
                        <th>Pending</th>
                    </tr>
                </thead>
                <tbody>${overviewRows}</tbody>
            </table>

            ${detailSections}
        </body>
        </html>
    `;
};

const downloadPdf = () => {
    if (!latestReport) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
        showAlert("Unable to open the print window. Please allow pop-ups and try again.", "error");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableReport());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

reportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadReport();
});

downloadPdfBtn?.addEventListener("click", downloadPdf);

document.addEventListener("DOMContentLoaded", async () => {
    setDefaultMonth();
    await loadReport();
});
