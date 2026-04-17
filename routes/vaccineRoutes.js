const express = require("express");
const router = express.Router();
const db = require("../db/connection");


// GET BABY VACCINE SCHEDULE
router.get("/schedule/:baby_id", (req, res) => {

    const babyId = req.params.baby_id;

    const sql = `
        SELECT 
            vs.schedule_id,
            v.vaccine_name,
            vs.due_date,
            vs.status
        FROM vaccination_schedule vs
        JOIN vaccines v
        ON vs.vaccine_id = v.vaccine_id
        WHERE vs.baby_id = ?
        ORDER BY vs.due_date
    `;

    db.query(sql, [babyId], (err, results) => {

        if (err) {
            console.error('Error fetching vaccination schedule:', err);
            return res.status(500).json({ error: "Unable to retrieve the vaccination schedule for the specified baby. Please check the baby ID and try again." });
        }

        res.json(results);
    });

});

// GET UPCOMING SCHEDULES WITHIN A WEEK
router.get("/schedules", (req, res) => {
    const sql = `
        SELECT
            vs.schedule_id,
            b.baby_id,
            b.baby_name,
            m.mother_name,
            v.vaccine_name,
            vs.due_date,
            vs.status
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        WHERE vs.status != 'Completed'
          AND vs.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY vs.due_date
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching upcoming schedules:', err);
            return res.status(500).json({ error: 'Unable to retrieve upcoming schedules right now.' });
        }

        res.json(results);
    });
});

// GET SENT REMINDERS WITH VACCINATION STATUS
router.get("/reminders", (req, res) => {
    const sql = `
        SELECT
            vs.schedule_id,
            vs.baby_id,
            b.baby_name,
            m.mother_name,
            m.phone_no,
            v.vaccine_name,
            vs.due_date,
            vs.status,
            vs.reminder_sent,
            latest_rr.reminder_id,
            latest_rr.reminder_sent AS reminder_date,
            latest_rr.message_status,
            latest_rr.message_id,
            latest_rr.delivery_state,
            latest_rr.provider_description,
            latest_rr.last_checked_at
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        LEFT JOIN (
            SELECT rr1.*
            FROM reminder_records rr1
            INNER JOIN (
                SELECT mother_id, phone_no, MAX(reminder_id) AS latest_reminder_id
                FROM reminder_records
                GROUP BY mother_id, phone_no
            ) rr2 ON rr2.latest_reminder_id = rr1.reminder_id
        ) latest_rr ON latest_rr.mother_id = m.mother_id AND latest_rr.phone_no = m.phone_no
        WHERE vs.reminder_sent = 1
        ORDER BY vs.status ASC, vs.due_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching sent reminders:', err);
            return res.status(500).json({ error: 'Unable to retrieve sent reminders right now.' });
        }

        res.json(results);
    });
});

module.exports = router;

// RECORD VACCINATION
router.post("/record", (req, res) => {

    const {
        baby_id,
        vaccine_id,
        vaccination_date
    } = req.body;

    const existingRecordSql = `
        SELECT record_id
        FROM vaccination_records
        WHERE baby_id = ? AND vaccine_id = ?
        ORDER BY vaccination_date DESC, record_id DESC
        LIMIT 1
    `;

    db.query(existingRecordSql, [baby_id, vaccine_id], (lookupErr, existingResults) => {
        if (lookupErr) {
            console.error('Error checking existing vaccination record:', lookupErr);
            return res.status(500).json({ error: "Failed to verify existing vaccination records." });
        }

        const persistSchedule = (message) => {
            const updateSchedule = `
                UPDATE vaccination_schedule
                SET status='Completed', completed_date=?
                WHERE baby_id=? AND vaccine_id=?
            `;

            db.query(updateSchedule,
                [vaccination_date, baby_id, vaccine_id], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating vaccination schedule:', updateErr);
                        return res.status(500).json({ error: "Vaccination recorded but failed to update the schedule status. Please contact support." });
                    }
                    res.json({ message });
                });
        };

        if (existingResults.length) {
            return persistSchedule("Vaccination record already existed and schedule was synced successfully");
        }

        const sql = `
            INSERT INTO vaccination_records
            (baby_id, vaccine_id, vaccination_date, status)
            VALUES (?, ?, ?, 'Completed')
        `;

        db.query(sql,
            [baby_id, vaccine_id, vaccination_date],
            (err) => {
                if (err) {
                    console.error('Error recording vaccination:', err);
                    return res.status(500).json({ error: "Failed to record the vaccination. Please ensure the baby and vaccine IDs are correct and the vaccination hasn't been recorded already." });
                }

                persistSchedule("Vaccination recorded successfully");
            });
    });

});
