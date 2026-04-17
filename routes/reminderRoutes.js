const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const sendReminders = require("../utils/reminderService");
const {
    sendAndTrackSMS,
    getDeliveryReport,
    buildDeliverySnapshot,
    logDeliveryReport
} = require("../utils/sendSMS");

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

const latestReminderJoin = `
    LEFT JOIN (
        SELECT rr1.*
        FROM reminder_records rr1
        INNER JOIN (
            SELECT mother_id, phone_no, MAX(reminder_id) AS latest_reminder_id
            FROM reminder_records
            GROUP BY mother_id, phone_no
        ) rr2 ON rr2.latest_reminder_id = rr1.reminder_id
    ) latest_rr ON latest_rr.mother_id = m.mother_id AND latest_rr.phone_no = m.phone_no
`;

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
            latest_rr.reminder_id AS latest_reminder_id,
            latest_rr.message_status AS latest_message_status,
            latest_rr.message_id AS latest_message_id,
            latest_rr.delivery_state AS latest_delivery_state,
            latest_rr.provider_description AS latest_provider_description,
            latest_rr.last_checked_at AS latest_last_checked_at
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        ${latestReminderJoin}
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
        const deliverySnapshot = buildDeliverySnapshot(trackingResult);

        logDeliveryReport(`Reminder for ${mother_name} (${formattedPhone})`, trackingResult);

        const insertResult = await queryAsync(`
            INSERT INTO reminder_records (
                mother_id,
                phone_no,
                reminder_sent,
                message_status,
                message_id,
                delivery_state,
                provider_description,
                last_checked_at
            )
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)
        `, [
            mother_id,
            phone_no,
            deliverySnapshot.messageStatus,
            deliverySnapshot.messageId,
            deliverySnapshot.deliveryState,
            deliverySnapshot.providerDescription,
            deliverySnapshot.lastCheckedAt
        ]);

        if (deliverySnapshot.deliveryBoolean === 1) {
            await queryAsync(`
                UPDATE vaccination_schedule
                SET reminder_sent = 1
                WHERE schedule_id = ?
            `, [schedule_id]);
        }

        if (deliverySnapshot.deliveryBoolean !== 1) {
            return res.status(trackingResult.delivery?.state === "failed" ? 502 : 202).json({
                error: trackingResult.delivery?.state === "failed"
                    ? "Reminder was accepted by the SMS gateway but was not delivered to the mother's phone."
                    : "Reminder was accepted by the SMS gateway, but delivery to the mother's phone is still pending confirmation.",
                details: deliverySnapshot.providerDescription,
                deliveryState: deliverySnapshot.deliveryState,
                deliveryBoolean: deliverySnapshot.deliveryBoolean,
                messageId: deliverySnapshot.messageId,
                reminderId: insertResult.insertId,
                messageStatus: deliverySnapshot.messageStatus
            });
        }

        res.json({
            message: "Vaccination reminder delivered successfully.",
            deliveryState: deliverySnapshot.deliveryState,
            deliveryBoolean: deliverySnapshot.deliveryBoolean,
            messageId: deliverySnapshot.messageId,
            reminderId: insertResult.insertId,
            messageStatus: deliverySnapshot.messageStatus,
            providerDescription: deliverySnapshot.providerDescription
        });
    } catch (error) {
        console.error("Send reminder error:", error);
        res.status(500).json({
            error: `Failed to send reminder: ${error.message}`
        });
    }
});

router.post("/refresh-delivery-status", async (req, res) => {
    try {
        const { reminder_id, schedule_id } = req.body;

        if (!reminder_id) {
            return res.status(400).json({ error: "Missing required field: reminder_id" });
        }

        const reminderRows = await queryAsync(`
            SELECT reminder_id, mother_id, phone_no, message_id
            FROM reminder_records
            WHERE reminder_id = ?
            LIMIT 1
        `, [reminder_id]);

        if (!reminderRows.length) {
            return res.status(404).json({ error: "Reminder record not found." });
        }

        const reminder = reminderRows[0];
        if (!reminder.message_id) {
            return res.status(400).json({ error: "This reminder does not have a TextSMS message ID for delivery tracking." });
        }

        const deliveryResult = await getDeliveryReport(reminder.message_id);
        const trackingResult = {
            messageId: reminder.message_id,
            responseDescription: deliveryResult.description,
            delivery: deliveryResult
        };
        const deliverySnapshot = buildDeliverySnapshot(trackingResult);

        await queryAsync(`
            UPDATE reminder_records
            SET message_status = ?,
                delivery_state = ?,
                provider_description = ?,
                last_checked_at = ?,
                message_id = ?
            WHERE reminder_id = ?
        `, [
            deliverySnapshot.messageStatus,
            deliverySnapshot.deliveryState,
            deliverySnapshot.providerDescription,
            deliverySnapshot.lastCheckedAt,
            deliverySnapshot.messageId,
            reminder_id
        ]);

        if (deliverySnapshot.deliveryBoolean === 1 && schedule_id) {
            await queryAsync(`
                UPDATE vaccination_schedule
                SET reminder_sent = 1
                WHERE schedule_id = ?
            `, [schedule_id]);
        }

        logDeliveryReport(`Refreshed delivery status for reminder ${reminder_id}`, trackingResult);

        res.json({
            reminderId: Number(reminder_id),
            scheduleId: schedule_id ? Number(schedule_id) : null,
            deliveryState: deliverySnapshot.deliveryState,
            deliveryBoolean: deliverySnapshot.deliveryBoolean,
            providerDescription: deliverySnapshot.providerDescription,
            messageStatus: deliverySnapshot.messageStatus,
            messageId: deliverySnapshot.messageId,
            lastCheckedAt: deliverySnapshot.lastCheckedAt
        });
    } catch (error) {
        console.error("Refresh delivery status error:", error);
        res.status(500).json({
            error: `Failed to refresh delivery status: ${error.message}`
        });
    }
});

router.post("/complete-vaccination", async (req, res) => {
    try {
        const { schedule_id, vaccination_date } = req.body;

        if (!schedule_id) {
            return res.status(400).json({
                error: "Missing required field: schedule_id"
            });
        }

        const scheduleRows = await queryAsync(`
            SELECT schedule_id, baby_id, vaccine_id, status
            FROM vaccination_schedule
            WHERE schedule_id = ?
            LIMIT 1
        `, [schedule_id]);

        if (!scheduleRows.length) {
            return res.status(404).json({
                error: "Vaccination schedule not found."
            });
        }

        const schedule = scheduleRows[0];
        const recordedDate = vaccination_date || new Date().toISOString().slice(0, 10);
        const existingRecord = await queryAsync(`
            SELECT record_id
            FROM vaccination_records
            WHERE baby_id = ?
              AND vaccine_id = ?
            ORDER BY vaccination_date DESC, record_id DESC
            LIMIT 1
        `, [schedule.baby_id, schedule.vaccine_id]);

        if (!existingRecord.length) {
            await queryAsync(`
                INSERT INTO vaccination_records (baby_id, vaccine_id, vaccination_date, status)
                VALUES (?, ?, ?, 'Completed')
            `, [schedule.baby_id, schedule.vaccine_id, recordedDate]);
        }

        await queryAsync(`
            UPDATE vaccination_schedule
            SET status = 'Completed',
                completed_date = ?
            WHERE schedule_id = ?
        `, [recordedDate, schedule_id]);

        res.json({
            message: schedule.status === "Completed"
                ? "Vaccination record synced successfully"
                : "Vaccination marked as complete successfully"
        });
    } catch (error) {
        console.error("Complete vaccination error:", error);
        res.status(500).json({
            error: `Failed to mark vaccination as complete: ${error.message}`
        });
    }
});

module.exports = router;
