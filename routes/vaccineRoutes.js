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

// GET SENT REMINDERS
router.get("/reminders", (req, res) => {
    const sql = `
        SELECT
            rr.reminder_id,
            m.mother_name,
            rr.phone_no,
            rr.reminder_sent,
            rr.message_status
        FROM reminder_records rr
        LEFT JOIN mothers m ON rr.mother_id = m.mother_id
        ORDER BY rr.reminder_id DESC
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

    const sql = `
        INSERT INTO vaccination_records
        (baby_id, vaccine_id, vaccination_date, status)
        VALUES (?, ?, ?, 'Completed')
    `;

    db.query(sql,
        [baby_id, vaccine_id, vaccination_date],
        (err, result) => {

            if (err) {
                console.error('Error recording vaccination:', err);
                return res.status(500).json({ error: "Failed to record the vaccination. Please ensure the baby and vaccine IDs are correct and the vaccination hasn't been recorded already." });
            }

            // UPDATE SCHEDULE
            const updateSchedule = `
                UPDATE vaccination_schedule
                SET status='Completed', completed_date=?
                WHERE baby_id=? AND vaccine_id=?
            `;

            db.query(updateSchedule,
                [vaccination_date, baby_id, vaccine_id], (err) => {
                    if (err) {
                        console.error('Error updating vaccination schedule:', err);
                        return res.status(500).json({ error: "Vaccination recorded but failed to update the schedule status. Please contact support." });
                    }
                    res.json({
                        message: "Vaccination recorded successfully"
                    });
                });

        });

});