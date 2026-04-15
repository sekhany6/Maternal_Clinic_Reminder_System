const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const sendReminders = require("../utils/reminderService");
const sendSMS = require("../utils/sendSMS");

// SIMPLE ROUTE
router.get("/send-reminders", async (req, res) => {
    try {
        const result = await sendReminders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to send reminders" });
    }
});

// GET ALL PENDING VACCINATIONS FOR CURRENT MONTH (both sent and not sent reminders)
router.get("/upcoming-vaccinations", (req, res) => {
    const sql = `
        SELECT
            vs.schedule_id,
            b.baby_id,
            b.baby_name,
            m.mother_id,
            m.mother_name,
            m.phone_no,
            v.vaccine_name,
            vs.due_date,
            vs.status,
            vs.reminder_sent
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        WHERE vs.status != 'Completed'
          AND MONTH(vs.due_date) = MONTH(CURDATE())
          AND YEAR(vs.due_date) = YEAR(CURDATE())
        ORDER BY vs.reminder_sent ASC, vs.due_date ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching upcoming vaccinations:', err);
            return res.status(500).json({ error: 'Unable to retrieve upcoming vaccinations' });
        }

        res.json(results);
    });
});

// FORMAT PHONE NUMBER TO INTERNATIONAL FORMAT  
const formatPhone = (phone) => {
    phone = phone.trim();
    if (phone.startsWith("0")) {
        return "254" + phone.slice(1);
    }
    if (phone.startsWith("+254")) {
        return phone.slice(1);
    }
    return phone;
};

// SEND AUTOMATED VACCINATION REMINDER MESSAGE TO MOTHER
router.post("/send-vaccination-reminder", async (req, res) => {
    try {
        const { schedule_id, mother_id, mother_name, phone_no, vaccine_name, baby_name, due_date } = req.body;

        // Validate required fields
        if (!schedule_id || !mother_id || !phone_no || !vaccine_name || !baby_name || !due_date || !mother_name) {
            return res.status(400).json({
                error: "Missing required fields: schedule_id, mother_id, mother_name, phone_no, vaccine_name, baby_name, and due_date"
            });
        }

        // Format phone number
        const formattedPhone = formatPhone(phone_no);

        // Format due_date cleanly
        const dueDate = new Date(due_date).toDateString();

        // Construct automated message (same format as the automated system)
        const smsMessage = `Hello ${mother_name}, your child ${baby_name} is due for ${vaccine_name} on ${dueDate}. Please visit the clinic.`;

        // Send SMS
        const smsResult = await sendSMS(formattedPhone, smsMessage);

        // Record the message in database
        const recordSql = `
            INSERT INTO reminder_records (mother_id, phone_no, reminder_sent, message_status)
            VALUES (?, ?, NOW(), 'Sent')
        `;

        // Update vaccination_schedule to mark reminder as sent for THIS SPECIFIC VACCINATION
        const updateScheduleSql = `
            UPDATE vaccination_schedule
            SET reminder_sent = 1
            WHERE schedule_id = ?
        `;

        // Execute both queries
        db.query(recordSql, [mother_id, phone_no], (err) => {
            if (err) {
                console.error("DB insert error:", err);
            }
        });

        db.query(updateScheduleSql, [schedule_id], (err) => {
            if (err) {
                console.error("DB update error:", err);
                return res.json({
                    message: "Vaccination reminder sent successfully",
                    smsResult: smsResult,
                    dbError: "Could not mark vaccination as sent"
                });
            }

            res.json({
                message: "Vaccination reminder sent successfully",
                smsResult: smsResult
            });
        });

    } catch (error) {
        console.error("Send reminder error:", error);
        res.status(500).json({
            error: "Failed to send reminder: " + error.message
        });
    }
});

// MARK VACCINATION AS COMPLETE
router.post("/complete-vaccination", async (req, res) => {
    try {
        const { schedule_id } = req.body;

        // Validate required fields
        if (!schedule_id) {
            return res.status(400).json({
                error: "Missing required field: schedule_id"
            });
        }

        // Update vaccination_schedule to mark status as Completed
        const updateSql = `
            UPDATE vaccination_schedule
            SET status = 'Completed'
            WHERE schedule_id = ?
        `;

        db.query(updateSql, [schedule_id], (err) => {
            if (err) {
                console.error("DB update error:", err);
                return res.status(500).json({
                    error: "Failed to mark vaccination as complete"
                });
            }

            res.json({
                message: "Vaccination marked as complete successfully"
            });
        });

    } catch (error) {
        console.error("Complete vaccination error:", error);
        res.status(500).json({
            error: "Failed to mark vaccination as complete: " + error.message
        });
    }
});

module.exports = router;