const API = "http://localhost:3000/api";
const pendingTableBody = document.getElementById("pendingTableBody");
const sentTableBody = document.getElementById("sentTableBody");
const pendingSection = document.getElementById("pendingSection");
const sentSection = document.getElementById("sentSection");
const noDataMessage = document.getElementById("noDataMessage");
const loadingDiv = document.getElementById("loading");
const messageModal = document.getElementById("messageModal");
const messageForm = document.getElementById("messageForm");
const alertBox = document.getElementById("alertbox");
const closeBtn = document.querySelector(".close");
const cancelBtn = document.getElementById("cancelBtn");
const searchInput = document.getElementById("searchInput");
const searchSection = document.getElementById("searchSection");
const searchCount = document.getElementById("searchCount");
const searchButton = document.getElementById("searchButton");
const pendingCount = document.getElementById("pendingCount");
const sentCount = document.getElementById("sentCount");
const totalCount = document.getElementById("totalCount");

// Get URL parameters for filtering
const getURLParameters = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        babyId: params.get("baby_id"),
        babyName: params.get("baby_name")
    };
};

// Store all data for filtering
let allVaccinationData = [];
let pendingVaccinations = [];
let sentVaccinations = [];
let filteredByBaby = false;

// Search functionality
const filterVaccinations = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Filter pending table
    const pendingRows = pendingTableBody.querySelectorAll("tr");
    let pendingVisibleCount = 0;
    pendingRows.forEach(row => {
        const motherName = row.cells[1].textContent.toLowerCase();
        if (motherName.includes(searchTerm)) {
            row.style.display = "";
            pendingVisibleCount++;
        } else {
            row.style.display = "none";
        }
    });
    
    // Filter sent table
    const sentRows = sentTableBody.querySelectorAll("tr");
    let sentVisibleCount = 0;
    sentRows.forEach(row => {
        const motherName = row.cells[1].textContent.toLowerCase();
        if (motherName.includes(searchTerm)) {
            row.style.display = "";
            sentVisibleCount++;
        } else {
            row.style.display = "none";
        }
    });
    
    const totalVisibleCount = pendingVisibleCount + sentVisibleCount;
    const totalDataCount = pendingVaccinations.length + sentVaccinations.length;
    
    // Update search count
    if (searchTerm) {
        searchCount.textContent = `${totalVisibleCount} result${totalVisibleCount !== 1 ? 's' : ''} found`;
    } else {
        searchCount.textContent = `${totalDataCount} vaccination${totalDataCount !== 1 ? 's' : ''}`;
    }
    
    // Show/hide sections based on visible rows
    pendingSection.style.display = pendingVisibleCount > 0 ? "block" : "none";
    sentSection.style.display = sentVisibleCount > 0 ? "block" : "none";
    
    if (totalVisibleCount === 0 && searchTerm) {
        noDataMessage.textContent = "No vaccinations found matching your search.";
        noDataMessage.style.display = "block";
    } else if (totalVisibleCount === 0) {
        noDataMessage.style.display = "none";
    }
};

// Add event listener to search input
searchInput.addEventListener("input", filterVaccinations);
searchButton?.addEventListener("click", filterVaccinations);

// Clear search on focus
searchInput.addEventListener("focus", () => {
    if (searchInput.value === "") {
        searchCount.textContent = "";
    }
});

// Close modal when X is clicked
closeBtn.addEventListener("click", () => {
    messageModal.style.display = "none";
});

// Close modal when cancel button is clicked
cancelBtn.addEventListener("click", () => {
    messageModal.style.display = "none";
});

// Close modal when clicking outside of it
window.addEventListener("click", (event) => {
    if (event.target == messageModal) {
        messageModal.style.display = "none";
    }
});

// Format date to readable format (same as automation)
const formatDateForMessage = (dueDate) => {
    return new Date(dueDate).toDateString();
};

// Generate the automated message (same format as the system automation)
const generateAutomatedMessage = (motherName, babyName, vaccineName, dueDate) => {
    const formattedDate = formatDateForMessage(dueDate);
    return `Hello ${motherName}, your child ${babyName} is due for ${vaccineName} on ${formattedDate}. Please visit the clinic.`;
};

const getDeliveryBadge = (item) => {
    const latestStatus = (item.latest_message_status || "").toLowerCase();

    if (Number(item.reminder_sent) === 1 || latestStatus.startsWith("delivered:")) {
        return {
            className: "delivery-indicator is-delivered",
            label: "Delivered",
            title: item.latest_message_status || "Delivered to mother's phone"
        };
    }

    if (latestStatus.startsWith("not delivered:")) {
        return {
            className: "delivery-indicator is-failed",
            label: "Not Delivered",
            title: item.latest_message_status
        };
    }

    if (latestStatus.startsWith("delivery pending:")) {
        return {
            className: "delivery-indicator is-pending",
            label: "Pending",
            title: item.latest_message_status
        };
    }

    return {
        className: "delivery-indicator",
        label: "Not Sent",
        title: "No reminder has been sent for this vaccination yet."
    };
};

// Create table row
const createTableRow = (item, isResend = false) => {
    const row = document.createElement("tr");
    const dueDate = new Date(item.due_date).toLocaleDateString();
    const buttonText = isResend ? "Resend Reminder" : "Send Reminder";
    const deliveryBadge = getDeliveryBadge(item);
    const deliveryMarkup = `<span class="${deliveryBadge.className}" aria-label="${deliveryBadge.label}" title="${deliveryBadge.title}">${deliveryBadge.label}</span>`;
    
    row.innerHTML = `
        <td data-label="Baby Name">${item.baby_name}</td>
        <td data-label="Mother Name">${item.mother_name}</td>
        <td data-label="Phone Number">${item.phone_no}</td>
        <td data-label="Vaccine">${item.vaccine_name}</td>
        <td data-label="Due Date">${dueDate}</td>
        <td data-label="Status">${item.status}</td>
        <td data-label="Delivery">${deliveryMarkup}</td>
        <td data-label="Action">
            <button type="button" class="send-btn" onclick="openMessageModal(${item.schedule_id}, ${item.mother_id}, '${item.mother_name}', '${item.phone_no}', '${item.vaccine_name}', '${item.baby_name}', '${item.due_date}')">
                ${buttonText}
            </button>
        </td>
    `;
    return row;
};

const updateDashboardCounts = () => {
    if (pendingCount) {
        pendingCount.textContent = pendingVaccinations.length;
    }

    if (sentCount) {
        sentCount.textContent = sentVaccinations.length;
    }

    if (totalCount) {
        totalCount.textContent = pendingVaccinations.length + sentVaccinations.length;
    }
};

// Fetch and display upcoming vaccinations
const fetchUpcomingVaccinations = async () => {
    loadingDiv.style.display = "block";
    pendingSection.style.display = "none";
    sentSection.style.display = "none";
    searchSection.style.display = "none";
    noDataMessage.style.display = "none";

    try {
        const res = await fetch(`${API}/reminders/upcoming-vaccinations`);
        const data = await res.json();

        loadingDiv.style.display = "none";

        if (!res.ok) {
            showAlert(data.error || "Failed to fetch upcoming vaccinations", "error");
            return;
        }

        if (data.length === 0) {
            noDataMessage.style.display = "block";
            return;
        }

        // Store all data
        allVaccinationData = data;
        
        // Get baby_id from URL if present
        const { babyId, babyName } = getURLParameters();
        
        // Filter by baby_id if it's provided
        let dataToDisplay = data;
        if (babyId) {
            dataToDisplay = data.filter(item => item.baby_id == babyId);
            filteredByBaby = true;
        }
        
        // Separate data by reminder_sent status
        pendingVaccinations = dataToDisplay.filter(item => item.reminder_sent === 0);
        sentVaccinations = dataToDisplay.filter(item => item.reminder_sent === 1);

        // Populate pending table (reminder not sent yet)
        pendingTableBody.innerHTML = "";
        pendingVaccinations.forEach(item => {
            pendingTableBody.appendChild(createTableRow(item, false));
        });

        // Populate sent table (reminder already sent, but still pending)
        sentTableBody.innerHTML = "";
        sentVaccinations.forEach(item => {
            sentTableBody.appendChild(createTableRow(item, true));
        });

        // Show/hide sections
        if (pendingVaccinations.length > 0) {
            pendingSection.style.display = "block";
        }
        if (sentVaccinations.length > 0) {
            sentSection.style.display = "block";
        }

        updateDashboardCounts();

        searchSection.style.display = "block";
        const totalVaccinations = pendingVaccinations.length + sentVaccinations.length;
        searchCount.textContent = `${totalVaccinations} vaccination${totalVaccinations !== 1 ? 's' : ''}`;
        searchInput.value = ""; // Clear search input

    } catch (error) {
        loadingDiv.style.display = "none";
        showAlert("Error fetching vaccinations: " + error.message, "error");
    }
};

// Open message modal with pre-filled data and message preview
const openMessageModal = (scheduleId, motherId, motherName, phone, vaccine, baby, dueDate) => {
    document.getElementById("scheduleId").value = scheduleId;
    document.getElementById("motherId").value = motherId;
    document.getElementById("motherName").value = motherName;
    document.getElementById("phoneNo").value = phone;
    document.getElementById("vaccName").value = vaccine;
    document.getElementById("babyName").value = baby;
    document.getElementById("dueDate").value = dueDate;
    
    document.getElementById("modalBabyName").value = baby;
    document.getElementById("modalVaccine").value = vaccine;
    document.getElementById("modalPhone").value = phone;
    document.getElementById("modalDueDate").value = new Date(dueDate).toLocaleDateString();
    
    // Generate and show the message preview
    const automatedMessage = generateAutomatedMessage(motherName, baby, vaccine, dueDate);
    document.getElementById("messagePreview").value = automatedMessage;
    
    messageModal.style.display = "block";
};

// Handle message form submission
messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const scheduleId = document.getElementById("scheduleId").value;
    const motherId = document.getElementById("motherId").value;
    const motherName = document.getElementById("motherName").value;
    const phoneNo = document.getElementById("phoneNo").value;
    const vaccName = document.getElementById("vaccName").value;
    const babyName = document.getElementById("babyName").value;
    const dueDate = document.getElementById("dueDate").value;

    try {
        const res = await fetch(`${API}/reminders/send-vaccination-reminder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schedule_id: scheduleId,
                mother_id: motherId,
                mother_name: motherName,
                phone_no: phoneNo,
                vaccine_name: vaccName,
                baby_name: babyName,
                due_date: dueDate
            })
        });

        const result = await res.json();

        if (res.ok && result.deliveryState === "delivered") {
            showAlert(result.message || "Vaccination reminder delivered successfully!", "success");
            messageModal.style.display = "none";
            setTimeout(() => {
                fetchUpcomingVaccinations();
            }, 1500);
        } else if (res.status === 202) {
            const details = result.details ? ` Details: ${result.details}` : "";
            showAlert(`${result.error || "Delivery is still pending confirmation."}${details}`, "warning");
            messageModal.style.display = "none";
        } else {
            const details = result.details ? ` Details: ${result.details}` : "";
            showAlert(`${result.error || "Failed to send reminder"}${details}`, "error");
        }

    } catch (error) {
        showAlert("Error sending reminder: " + error.message, "error");
    }
});

// Show alert message
const showAlert = (message, type) => {
    alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    if (type !== "error") {
        setTimeout(() => {
            alertBox.innerHTML = "";
        }, 5000);
    }
};

// Load upcoming vaccinations on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchUpcomingVaccinations();
});
