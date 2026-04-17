const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const sendReminders = require("../utils/reminderService");
const { sendAndTrackSMS } = require("../utils/sendSMS");

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
    });
});

const formatPhone = (phone) => {
    const normalizedPhone = phone.trim();

    if (normalizedPhone.startsWith("0")) {
        return `254${normalizedPhone.slice(1)}`;
    }

    if (normalizedPhone.startsWith("+254")) {
        return normalizedPhone.slice(1);
    }

    return normalizedPhone;
};

const buildMessageStatus = (trackingResult) => {
    const delivery = trackingResult.delivery || {};
    const prefix = delivery.state === "delivered"
        ? "Delivered"
        : delivery.state === "failed"
            ? "Not delivered"
            : "Delivery pending";
    const messageIdText = trackingResult.messageId ? ` [Message ID: ${trackingResult.messageId}]` : "";

    return `${prefix}: ${delivery.description || trackingResult.responseDescription || "No provider description available."}${messageIdText}`;
};

router.get("/send-reminders", async (req, res) => {
    try {
        const result = await sendReminders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to send reminders" });
    }
});

router.get("/upcoming-vaccinations", (req, res) => {
    const scheduleId = req.query.schedule_id;
    const babyId = req.query.baby_id;
    const filters = [
        "vs.status != 'Completed'",
        "MONTH(vs.due_date) = MONTH(CURDATE())",
        "YEAR(vs.due_date) = YEAR(CURDATE())"
    ];
    const params = [];

    if (scheduleId) {
        filters.push("vs.schedule_id = ?");
        params.push(scheduleId);
    }

    if (babyId) {
        filters.push("b.baby_id = ?");
        params.push(babyId);
    }

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
            vs.reminder_sent,
            (
                SELECT rr.message_status
                FROM reminder_records rr
                WHERE rr.mother_id = m.mother_id
                  AND rr.phone_no = m.phone_no
                ORDER BY rr.reminder_sent DESC
                LIMIT 1
            ) AS latest_message_status
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        WHERE ${filters.join("\n          AND ")}
        ORDER BY vs.reminder_sent ASC, vs.due_date ASC
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching upcoming vaccinations:", err);
            return res.status(500).json({ error: "Unable to retrieve upcoming vaccinations" });
        }

        res.json(results);
    });
});

router.post("/send-vaccination-reminder", async (req, res) => {
    try {
        const { schedule_id, mother_id, mother_name, phone_no, vaccine_name, baby_name, due_date } = req.body;

        if (!schedule_id || !mother_id || !phone_no || !vaccine_name || !baby_name || !due_date || !mother_name) {
            return res.status(400).json({
                error: "Missing required fields: schedule_id, mother_id, mother_name, phone_no, vaccine_name, baby_name, and due_date"
            });
        }

        const formattedPhone = formatPhone(phone_no);
        const dueDate = new Date(due_date).toDateString();
        const smsMessage = `Hello ${mother_name}, your child ${baby_name} is due for ${vaccine_name} on ${dueDate}. Please visit the clinic.`;
        const trackingResult = await sendAndTrackSMS(formattedPhone, smsMessage);
        const messageStatus = buildMessageStatus(trackingResult);

        await queryAsync(`
            INSERT INTO reminder_records (mother_id, phone_no, reminder_sent, message_status)
            VALUES (?, ?, NOW(), ?)
        `, [mother_id, phone_no, messageStatus]);

        if (!trackingResult.delivery?.delivered) {
            return res.status(trackingResult.delivery?.state === "failed" ? 502 : 202).json({
                error: trackingResult.delivery?.state === "failed"
                    ? "Reminder was accepted by the SMS gateway but was not delivered to the mother's phone."
                    : "Reminder was accepted by the SMS gateway, but delivery to the mother's phone is still pending confirmation.",
                details: trackingResult.delivery?.description || trackingResult.responseDescription,
                deliveryState: trackingResult.delivery?.state || "pending",
                messageId: trackingResult.messageId
            });
        }

        await queryAsync(`
            UPDATE vaccination_schedule
            SET reminder_sent = 1
            WHERE schedule_id = ?
        `, [schedule_id]);

        res.json({
            message: "Vaccination reminder delivered successfully.",
            deliveryState: trackingResult.delivery.state,
            messageId: trackingResult.messageId
        });
    } catch (error) {
        console.error("Send reminder error:", error);
        res.status(500).json({
            error: `Failed to send reminder: ${error.message}`
        });
    }
});

router.post("/complete-vaccination", async (req, res) => {
    try {
        const { schedule_id } = req.body;

        if (!schedule_id) {
            return res.status(400).json({
                error: "Missing required field: schedule_id"
            });
        }

        await queryAsync(`
            UPDATE vaccination_schedule
            SET status = 'Completed'
            WHERE schedule_id = ?
        `, [schedule_id]);

        res.json({
            message: "Vaccination marked as complete successfully"
        });
    } catch (error) {
        console.error("Complete vaccination error:", error);
        res.status(500).json({
            error: `Failed to mark vaccination as complete: ${error.message}`
        });
    }
});

module.exports = router;
