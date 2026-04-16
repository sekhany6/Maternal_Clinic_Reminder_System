const API = "http://localhost:3000/api";
const reportForm = document.getElementById("hospitalReportForm");
const reportMonthInput = document.getElementById("reportMonth");
const reportMonthLabel = document.getElementById("reportMonthLabel");
const reportAlert = document.getElementById("reportAlert");
const reportSummary = document.getElementById("reportSummary");
const reportTable = document.getElementById("hospitalReportTable");
const reportEmpty = document.getElementById("hospitalReportEmpty");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const summaryHospitals = document.getElementById("summaryHospitals");
const summaryStaff = document.getElementById("summaryStaff");
const summaryMothers = document.getElementById("summaryMothers");
const summaryChildren = document.getElementById("summaryChildren");
const summaryCompleted = document.getElementById("summaryCompleted");

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

const renderSummary = (summary) => {
    summaryHospitals.textContent = summary.hospitals;
    summaryStaff.textContent = summary.staff;
    summaryMothers.textContent = summary.mothers;
    summaryChildren.textContent = summary.children;
    summaryCompleted.textContent = summary.completedVaccinations;
    reportSummary.style.display = "grid";
};

const renderTable = (records) => {
    reportTable.innerHTML = "";

    if (!records.length) {
        reportEmpty.style.display = "block";
        return;
    }

    reportEmpty.style.display = "none";
    records.forEach((record) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td data-label="Hospital">${record.hospital_name}</td>
            <td data-label="Location">${record.location || "-"}</td>
            <td data-label="Contact">${record.contact || "-"}</td>
            <td data-label="Staff">${record.staff_count}</td>
            <td data-label="Mothers">${record.mother_count}</td>
            <td data-label="Children">${record.child_count}</td>
            <td data-label="Completed Vaccinations">${record.completed_vaccinations}</td>
        `;
        reportTable.appendChild(row);
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
        downloadPdfBtn.disabled = data.records.length === 0;
    } catch (error) {
        latestReport = null;
        reportSummary.style.display = "none";
        reportTable.innerHTML = "";
        reportEmpty.style.display = "block";
        showAlert(error.message, "error");
    }
};

const buildPrintableReport = () => {
    if (!latestReport) return "";

    const rows = latestReport.records.map((record) => `
        <tr>
            <td>${record.hospital_name}</td>
            <td>${record.location || "-"}</td>
            <td>${record.contact || "-"}</td>
            <td>${record.staff_count}</td>
            <td>${record.mother_count}</td>
            <td>${record.child_count}</td>
            <td>${record.completed_vaccinations}</td>
        </tr>
    `).join("");

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hospital Records ${latestReport.monthLabel}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 32px; color: #1c3552; }
                h1, h2 { margin: 0 0 12px; }
                p { margin: 0 0 8px; }
                .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 24px 0; }
                .summary-card { border: 1px solid #cfe0f2; border-radius: 12px; padding: 12px; background: #f8fbff; }
                .summary-label { font-size: 12px; text-transform: uppercase; color: #5f7ea2; margin-bottom: 6px; }
                .summary-value { font-size: 24px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #d7e4f2; padding: 10px; text-align: left; }
                th { background: #eef6ff; }
            </style>
        </head>
        <body>
            <h1>Monthly Hospital Records</h1>
            <p><strong>Month:</strong> ${latestReport.monthLabel}</p>
            <p>Maternal Clinic Reminder System</p>

            <section class="summary">
                <div class="summary-card"><div class="summary-label">Hospitals</div><div class="summary-value">${latestReport.summary.hospitals}</div></div>
                <div class="summary-card"><div class="summary-label">Staff</div><div class="summary-value">${latestReport.summary.staff}</div></div>
                <div class="summary-card"><div class="summary-label">Mothers</div><div class="summary-value">${latestReport.summary.mothers}</div></div>
                <div class="summary-card"><div class="summary-label">Children</div><div class="summary-value">${latestReport.summary.children}</div></div>
                <div class="summary-card"><div class="summary-label">Completed Vaccinations</div><div class="summary-value">${latestReport.summary.completedVaccinations}</div></div>
            </section>

            <table>
                <thead>
                    <tr>
                        <th>Hospital</th>
                        <th>Location</th>
                        <th>Contact</th>
                        <th>Staff</th>
                        <th>Mothers</th>
                        <th>Children</th>
                        <th>Completed Vaccinations</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
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
