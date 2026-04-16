const API = "http://localhost:3000/api";

const isValidPhone = (phone) => {
    const normalized = phone.replace(/[^0-9+]/g, "");
    const phonePattern = /^(\+?[0-9]{9,15})$/;
    return phonePattern.test(normalized);
};

const motherSearchForm = document.getElementById("motherSearchForm");
const motherSearchPhone = document.getElementById("motherSearchPhone");
const motherSearchResults = document.getElementById("motherSearchResults");

const closeSearchResults = () => {
    if (motherSearchResults) {
        motherSearchResults.innerHTML = "";
    }
};

const renderMotherSearchResults = (mother) => {
    if (!mother) {
        motherSearchResults.innerHTML = `
            <div class="search-results-panel">
                <button type="button" id="closeSearchResults" class="close-results">Close</button>
                <p>No mother found.</p>
            </div>
        `;
        document.getElementById("closeSearchResults")?.addEventListener("click", closeSearchResults);
        return;
    }

    const childRows = mother.children.length
        ? mother.children.map(child => `
            <tr class="child-row" data-baby-id="${child.baby_id}">
                <td>${child.baby_name}</td>
                <td>${child.gender}</td>
                <td>${child.date_of_birth}</td>
                <td><button type="button" data-baby-id="${child.baby_id}">View Schedule</button></td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No children registered for this mother.</td></tr>`;

    motherSearchResults.innerHTML = `
        <div class="search-results-panel">
            <div class="mother-details">
                <div class="mother-details-header">
                    <h4>Mother Details</h4>
                    <button type="button" id="closeSearchResults" class="close-results">×</button>
                </div>
                <p><strong>Name:</strong> ${mother.mother_name}</p>
                <p><strong>Phone:</strong> ${mother.phone_no}</p>
                <p><strong>National ID:</strong> ${mother.national_id}</p>
                <p><strong>Hospital ID:</strong> ${mother.hospital_id}</p>
            </div>
            <div class="children-list">
                <h4>Children Registered</h4>
                <table border="1">
                    <thead>
                        <tr>
                            <th>Baby</th>
                            <th>Gender</th>
                            <th>Birth Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="childrenTableBody">
                        ${childRows}
                    </tbody>
                </table>
            </div>
            <div class="child-schedule">
                <h4 id="childScheduleHeader"></h4>
                <table border="1" id="childScheduleTable">
                    <thead>
                        <tr>
                            <th>Vaccine</th>
                            <th>Due Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="childScheduleBody"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("closeSearchResults")?.addEventListener("click", closeSearchResults);

    const scheduleButtons = motherSearchResults.querySelectorAll("button[data-baby-id]");
    scheduleButtons.forEach(button => {
        button.addEventListener("click", () => {
            const babyId = button.getAttribute("data-baby-id");
            const babyName = button.closest("tr").querySelector("td").textContent;
            // Redirect to schedule-child.html with baby_id and baby_name parameters
            window.location.href = `schedule-child.html?baby_id=${encodeURIComponent(babyId)}&baby_name=${encodeURIComponent(babyName)}`;
        });
    });
};

const fetchBabySchedule = async (babyId, babyName) => {
    const childScheduleHeader = document.getElementById("childScheduleHeader");
    const childScheduleBody = document.getElementById("childScheduleBody");
    if (!childScheduleHeader || !childScheduleBody) return;

    childScheduleHeader.textContent = `Vaccination schedule for ${babyName}`;
    childScheduleBody.innerHTML = "<tr><td colspan=3>Loading schedule...</td></tr>";

    try {
        const res = await fetch(`${API}/vaccines/schedule/${encodeURIComponent(babyId)}`);
        const schedule = await res.json();

        if (!res.ok) {
            childScheduleBody.innerHTML = `<tr><td colspan=3>${schedule.error || "Unable to load schedule."}</td></tr>`;
            return;
        }

        if (!schedule.length) {
            childScheduleBody.innerHTML = `<tr><td colspan=3>No vaccination schedule found.</td></tr>`;
            return;
        }

        childScheduleBody.innerHTML = schedule.map(item => `
            <tr>
                <td>${item.vaccine_name}</td>
                <td>${item.due_date}</td>
                <td>${item.status}</td>
            </tr>
        `).join("");
    } catch (error) {
        childScheduleBody.innerHTML = `<tr><td colspan=3>Error loading schedule.</td></tr>`;
    }
};

if (motherSearchForm) {
    motherSearchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const phone = motherSearchPhone.value.trim();

        if (!isValidPhone(phone)) {
            return alert("Please enter a valid phone number.");
        }

        try {
            const res = await fetch(`${API}/mothers/search?phone=${encodeURIComponent(phone)}`);
            const data = await res.json();
            if (!res.ok) {
                motherSearchResults.innerHTML = `
                    <div class="search-results-panel">
                        <div class="mother-details">
                            <div class="mother-details-header">
                                <h4>Search Result</h4>
                                <button type="button" id="closeSearchResults" class="close-results">×</button>
                            </div>
                            <p>${data.error || "Mother not found."}</p>
                        </div>
                    </div>
                `;
                document.getElementById("closeSearchResults")?.addEventListener("click", closeSearchResults);
                return;
            }
            renderMotherSearchResults(data);
        } catch (error) {
            motherSearchResults.innerHTML = `
                <div class="search-results-panel">
                    <div class="mother-details">
                        <div class="mother-details-header">
                            <h4>Search Result</h4>
                            <button type="button" id="closeSearchResults" class="close-results">×</button>
                        </div>
                        <p>Unable to search at this time.</p>
                    </div>
                </div>
            `;
            document.getElementById("closeSearchResults")?.addEventListener("click", closeSearchResults);
        }
    });
}

/*  STAFF REGISTER  */


/* STAFF LOGIN  */


/* REGISTER MOTHER */
const motherForm = document.getElementById("motherForm");

if (motherForm) {
    motherForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            mother_name: document.getElementById("mother_name").value,
            phone_no: document.getElementById("phone_no").value,
            national_id: document.getElementById("national_id").value,
            hospital_id: document.getElementById("hospital_id").value
        };

        try {
            const res = await fetch(`${API}/mothers/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            alert(result.message || "Mother registered");
            window.location.href = "register-baby.html?mother_phone=" + encodeURIComponent(data.phone_no);

        } catch (error) {
            alert("Error registering mother");
        }
    });
}


/* REGISTER BABY  */
const babyForm = document.getElementById("babyForm");
const babyFieldsContainer = document.getElementById("babyFieldsContainer");
const addBabyBtn = document.getElementById("addBabyBtn");

const createBabyEntry = (value = {}) => {
    const wrapper = document.createElement("div");
    wrapper.className = "baby-entry";
    wrapper.innerHTML = `
        <div class="baby-entry-header">Baby details</div>
        <input type="text" name="baby_name" placeholder="Baby Name" required value="${value.baby_name || ""}">
        <input type="date" name="date_of_birth" placeholder="Birth Date" required value="${value.date_of_birth || ""}">
        <select name="gender" required>
            <option value="">Select gender</option>
            <option value="Male" ${value.gender === "Male" ? "selected" : ""}>Male</option>
            <option value="Female" ${value.gender === "Female" ? "selected" : ""}>Female</option>
        </select>
        <button type="button" class="remove-baby-btn">Remove Baby</button>
    `;

    const inputs = wrapper.querySelectorAll("input[name='baby_name'], input[name='date_of_birth'], select[name='gender']");
    inputs.forEach(input => {
        input.addEventListener("input", renderBabyPreview);
        input.addEventListener("change", renderBabyPreview);
    });

    const removeBtn = wrapper.querySelector(".remove-baby-btn");
    removeBtn.addEventListener("click", () => {
        if (babyFieldsContainer.children.length > 1) {
            wrapper.remove();
            renderBabyPreview();
        }
    });

    return wrapper;
};

const renderBabyPreview = () => {
    const preview = document.getElementById("babyListPreview");
    if (!preview) return;

    const babyEntries = Array.from(document.querySelectorAll(".baby-entry"));
    if (!babyEntries.length) {
        preview.innerHTML = "<p>No baby entries yet.</p>";
        return;
    }

    preview.innerHTML = babyEntries.map((entry, index) => {
        const name = entry.querySelector("input[name='baby_name']").value.trim() || "Unnamed baby";
        const dob = entry.querySelector("input[name='date_of_birth']").value || "No birth date";
        const gender = entry.querySelector("select[name='gender']").value || "No gender";
        return `
            <div class="baby-preview-card">
                <strong>Baby ${index + 1}</strong>
                <span>${name}</span>
                <span>${dob} • ${gender}</span>
            </div>
        `;
    }).join("");
};

const fillMotherPhoneFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("mother_phone");
    if (phone) {
        const motherPhoneInput = document.getElementById("mother_phone");
        if (motherPhoneInput) {
            motherPhoneInput.value = phone;
        }
    }
};

if (babyFieldsContainer) {
    babyFieldsContainer.appendChild(createBabyEntry());
    fillMotherPhoneFromQuery();
    renderBabyPreview();
}

if (addBabyBtn) {
    addBabyBtn.addEventListener("click", () => {
        if (babyFieldsContainer) {
            babyFieldsContainer.appendChild(createBabyEntry());
            renderBabyPreview();
        }
    });
}

if (babyForm) {
    babyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const motherPhone = document.getElementById("mother_phone").value.trim();

        if (!isValidPhone(motherPhone)) {
            return alert("Please enter a valid mother phone number.");
        }

        const babyEntries = Array.from(document.querySelectorAll(".baby-entry"));
        const babyDataList = babyEntries.map(entry => ({
            baby_name: entry.querySelector("input[name='baby_name']").value.trim(),
            date_of_birth: entry.querySelector("input[name='date_of_birth']").value,
            gender: entry.querySelector("select[name='gender']").value,
            mother_phone: motherPhone
        }));

        if (babyDataList.some(baby => !baby.baby_name || !baby.date_of_birth || !baby.gender)) {
            return alert("Please complete all baby fields before registering.");
        }

        let successCount = 0;
        let errorMessages = [];

        for (const babyData of babyDataList) {
            try {
                const res = await fetch(`${API}/babies/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(babyData)
                });

                const result = await res.json();
                if (res.ok) {
                    successCount += 1;
                } else {
                    errorMessages.push(result.message || result.error || "Failed to register a baby.");
                }
            } catch (error) {
                errorMessages.push("Error registering a baby.");
            }
        }

        let message = `${successCount} baby${successCount === 1 ? "" : "ies"} registered successfully.`;
        if (errorMessages.length) {
            message += "\n" + errorMessages.join(" \n");
        }
        alert(message);

        if (successCount > 0) {
            window.location.href = "dashboard.html";
        }
    });
}


/* LOAD SCHEDULES  */
const scheduleTable = document.getElementById("scheduleTable");

if (scheduleTable) {
    fetch(`${API}/vaccines/schedules`)
        .then(res => res.json())
        .then(data => {
            scheduleTable.innerHTML = "";

            data.forEach(row => {
                scheduleTable.innerHTML += `
                    <tr>
                        <td data-label="Baby"><a class="table-link" href="upcoming-vaccinations.html?baby_id=${encodeURIComponent(row.baby_id)}&baby_name=${encodeURIComponent(row.baby_name)}">${row.baby_name}</a></td>
                        <td data-label="Mother">${row.mother_name}</td>
                        <td data-label="Vaccine">${row.vaccine_name}</td>
                        <td data-label="Due Date">${new Date(row.due_date).toLocaleDateString()}</td>
                        <td data-label="Status">${row.status}</td>
                    </tr>
                `;
            });
        })
        .catch(() => {
            alert("Failed to load schedules");
        });
}


/*LOAD REMINDER */
const pendingReminderTable = document.getElementById("pendingReminderTable");
const completedReminderTable = document.getElementById("completedReminderTable");
const pendingNoData = document.getElementById("pendingNoData");
const completedNoData = document.getElementById("completedNoData");

if (pendingReminderTable || completedReminderTable) {
    fetch(`${API}/vaccines/reminders`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                if (pendingNoData) pendingNoData.style.display = "block";
                if (completedNoData) completedNoData.style.display = "block";
                return;
            }

            // Deduplicate by schedule_id - keep only the first occurrence of each vaccination
            const seenScheduleIds = new Set();
            const deduplicatedData = data.filter(row => {
                if (seenScheduleIds.has(row.schedule_id)) {
                    return false;
                }
                seenScheduleIds.add(row.schedule_id);
                return true;
            });

            // Separate data by vaccination status
            const pending = deduplicatedData.filter(row => row.status !== "Completed");
            const completed = deduplicatedData.filter(row => row.status === "Completed");

            // Populate pending vaccinations table
            if (pendingReminderTable) {
                pendingReminderTable.innerHTML = "";
                if (pending.length === 0) {
                    pendingNoData.style.display = "block";
                } else {
                    pendingNoData.style.display = "none";
                    pending.forEach(row => {
                        const dueDate = row.due_date ? new Date(row.due_date).toLocaleDateString() : "-";
                        pendingReminderTable.innerHTML += `
                            <tr>
                                <td data-label="Baby"><a class="table-link" href="schedule-child.html?baby_id=${encodeURIComponent(row.baby_id)}&baby_name=${encodeURIComponent(row.baby_name)}">${row.baby_name || "Unknown"}</a></td>
                                <td data-label="Mother">${row.mother_name || "Unknown"}</td>
                                <td data-label="Vaccine">${row.vaccine_name || "-"}</td>
                                <td data-label="Phone">${row.phone_no || "-"}</td>
                                <td data-label="Due Date">${dueDate}</td>
                                <td data-label="Status">${row.status || "-"}</td>
                            </tr>
                        `;
                    });
                }
            }

            // Populate completed vaccinations table
            if (completedReminderTable) {
                completedReminderTable.innerHTML = "";
                if (completed.length === 0) {
                    completedNoData.style.display = "block";
                } else {
                    completedNoData.style.display = "none";
                    completed.forEach(row => {
                        const dueDate = row.due_date ? new Date(row.due_date).toLocaleDateString() : "-";
                        completedReminderTable.innerHTML += `
                            <tr>
                                <td data-label="Baby"><a class="table-link" href="schedule-child.html?baby_id=${encodeURIComponent(row.baby_id)}&baby_name=${encodeURIComponent(row.baby_name)}">${row.baby_name || "Unknown"}</a></td>
                                <td data-label="Mother">${row.mother_name || "Unknown"}</td>
                                <td data-label="Vaccine">${row.vaccine_name || "-"}</td>
                                <td data-label="Phone">${row.phone_no || "-"}</td>
                                <td data-label="Due Date">${dueDate}</td>
                                <td data-label="Status">${row.status || "-"}</td>
                            </tr>
                        `;
                    });
                }
            }
        })
        .catch(() => {
            alert("Failed to load reminders");
        });
}
