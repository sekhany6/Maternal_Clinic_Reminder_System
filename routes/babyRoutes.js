const express = require("express");
const router = express.Router();
const db = require("../db/connection");

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
    });
});

const getDueDateFromDob = (dateOfBirth, intervalDays) => {
    const dueDate = new Date(dateOfBirth);
    dueDate.setDate(dueDate.getDate() + Number(intervalDays || 0));
    return dueDate;
};

const toDateOnlyString = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
};

const createVaccinationSchedule = async (babyId, dateOfBirth) => {
    const vaccines = await queryAsync("SELECT vaccine_id, vaccine_name, interval_days FROM vaccines");

    await Promise.all(vaccines.map(async (vaccine) => {
        const scheduleSql = `
            INSERT INTO vaccination_schedule
            (baby_id, vaccine_id, due_date, status, reminder_sent)
            VALUES (?, ?, ?, 'Pending', 0)
        `;

        await queryAsync(scheduleSql, [
            babyId,
            vaccine.vaccine_id,
            getDueDateFromDob(dateOfBirth, vaccine.interval_days)
        ]);
    }));
};

const recalculatePendingSchedule = async (babyId, dateOfBirth) => {
    const pendingSchedules = await queryAsync(`
        SELECT schedule_id, vaccine_id
        FROM vaccination_schedule
        WHERE baby_id = ?
          AND status != 'Completed'
    `, [babyId]);

    if (!pendingSchedules.length) {
        return 0;
    }

    const vaccines = await queryAsync(`
        SELECT vaccine_id, interval_days
        FROM vaccines
    `);

    const vaccineIntervals = new Map(
        vaccines.map(vaccine => [Number(vaccine.vaccine_id), Number(vaccine.interval_days || 0)])
    );

    await Promise.all(pendingSchedules.map(async (schedule) => {
        const intervalDays = vaccineIntervals.get(Number(schedule.vaccine_id));

        if (intervalDays === undefined) {
            return;
        }

        await queryAsync(`
            UPDATE vaccination_schedule
            SET due_date = ?, reminder_sent = 0
            WHERE schedule_id = ?
        `, [getDueDateFromDob(dateOfBirth, intervalDays), schedule.schedule_id]);
    }));

    return pendingSchedules.length;
};

// REGISTER BABY
router.post("/register", async (req, res) => {

    const {
        baby_name,
        date_of_birth,
        gender,
        mother_phone,
        mother_id
    } = req.body;

    if (!baby_name || !date_of_birth || !gender || (!mother_id && !mother_phone)) {
        return res.status(400).json({ error: "Missing required fields. Provide baby_name, date_of_birth, gender, and mother_phone or mother_id." });
    }

    const insertBaby = `
        INSERT INTO babies (baby_name, date_of_birth, gender, mother_id)
        VALUES (?, ?, ?, ?)
    `;

    try {
        let resolvedMotherId = mother_id;

        if (!resolvedMotherId) {
            const results = await queryAsync("SELECT mother_id FROM mothers WHERE phone_no = ?", [mother_phone]);

            if (!results || results.length === 0) {
                return res.status(404).json({ error: "No mother found with that phone number." });
            }

            resolvedMotherId = results[0].mother_id;
        }

        const result = await queryAsync(insertBaby, [baby_name, date_of_birth, gender, resolvedMotherId]);
        const babyId = result.insertId;

        await createVaccinationSchedule(babyId, date_of_birth);

        res.json({
            message: "Baby registered and vaccine schedule generated",
            baby_id: babyId
        });
    } catch (err) {
        console.error("Database error while registering baby:", err);
        return res.status(500).json({ error: "Failed to register baby. Please ensure all required fields are provided and the mother exists." });
    }

});

const updateBaby = async (req, res) => {
    const { baby_id } = req.params;
    const {
        baby_name,
        date_of_birth,
        gender
    } = req.body;

    if (!baby_id) {
        return res.status(400).json({ error: "Missing required route parameter: baby_id" });
    }

    if (!baby_name && !date_of_birth && !gender) {
        return res.status(400).json({ error: "Provide at least one field to update: baby_name, date_of_birth, or gender." });
    }

    try {
        const existingRows = await queryAsync(`
            SELECT baby_id, baby_name, date_of_birth, gender
            FROM babies
            WHERE baby_id = ?
        `, [baby_id]);

        if (!existingRows.length) {
            return res.status(404).json({ error: "Baby not found." });
        }

        const existingBaby = existingRows[0];
        const nextBabyName = baby_name || existingBaby.baby_name;
        const nextDateOfBirth = date_of_birth || existingBaby.date_of_birth;
        const nextGender = gender || existingBaby.gender;
        const dobChanged = !!date_of_birth && toDateOnlyString(date_of_birth) !== toDateOnlyString(existingBaby.date_of_birth);

        await queryAsync(`
            UPDATE babies
            SET baby_name = ?, date_of_birth = ?, gender = ?
            WHERE baby_id = ?
        `, [nextBabyName, nextDateOfBirth, nextGender, baby_id]);

        let updatedScheduleCount = 0;
        if (dobChanged) {
            updatedScheduleCount = await recalculatePendingSchedule(baby_id, nextDateOfBirth);
        }

        res.json({
            message: dobChanged
                ? "Baby details updated and pending vaccination schedule recalculated."
                : "Baby details updated successfully.",
            baby_id: Number(baby_id),
            updated_pending_schedules: updatedScheduleCount
        });
    } catch (err) {
        console.error("Error updating baby:", err);
        return res.status(500).json({ error: "Failed to update baby details." });
    }
};

router.get("/:baby_id", async (req, res) => {
    const { baby_id } = req.params;

    try {
        const rows = await queryAsync(`
            SELECT baby_id, baby_name, date_of_birth, gender, mother_id
            FROM babies
            WHERE baby_id = ?
        `, [baby_id]);

        if (!rows.length) {
            return res.status(404).json({ error: "Baby not found." });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching baby details:", err);
        return res.status(500).json({ error: "Failed to fetch baby details." });
    }
});

router.put("/:baby_id", updateBaby);
router.post("/update/:baby_id", updateBaby);

module.exports = router;
