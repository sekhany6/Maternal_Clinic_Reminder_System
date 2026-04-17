const db = require("../db/connection");
const { sendAndTrackSMS, buildDeliverySnapshot, logDeliveryReport } = require("./sendSMS");

const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

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

const sendReminders = async () => {
    const sql = `
        SELECT 
            vs.schedule_id,
            m.mother_id,
            m.mother_name,
            m.phone_no,
            b.baby_name,
            v.vaccine_name,
            vs.due_date
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        WHERE 
            vs.reminder_sent = 0
            AND DATEDIFF(vs.due_date, CURDATE()) = 3
    `;

    const results = await queryAsync(sql, []);

    if (results.length === 0) {
        return { message: "No reminders to send today" };
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const row of results) {
        try {
            const formattedPhone = formatPhone(row.phone_no);
            const dueDate = new Date(row.due_date).toDateString();
            const smsMessage = `Hello ${row.mother_name}, your child ${row.baby_name} is due for ${row.vaccine_name} on ${dueDate}. Please visit the clinic.`;
            const trackingResult = await sendAndTrackSMS(formattedPhone, smsMessage);
            const deliverySnapshot = buildDeliverySnapshot(trackingResult);

            logDeliveryReport(`Reminder for ${row.mother_name} (${formattedPhone})`, trackingResult);

            await queryAsync(`
                INSERT INTO reminder_records
                (mother_id, phone_no, reminder_sent, message_status, message_id, delivery_state, provider_description, last_checked_at)
                VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)
            `, [
                row.mother_id,
                row.phone_no,
                deliverySnapshot.messageStatus,
                deliverySnapshot.messageId,
                deliverySnapshot.deliveryState,
                deliverySnapshot.providerDescription,
                deliverySnapshot.lastCheckedAt
            ]);

            if (!trackingResult.delivery?.delivered) {
                failedCount++;
                errors.push({
                    mother: row.mother_name,
                    phone: row.phone_no,
                    error: deliverySnapshot.providerDescription
                });
                console.error(`Reminder delivery not complete for ${row.mother_name}:`, deliverySnapshot.messageStatus);
                continue;
            }

            await queryAsync(`
                UPDATE vaccination_schedule
                SET reminder_sent = 1
                WHERE schedule_id = ?
            `, [row.schedule_id]);

            successCount++;
            console.log(`Reminder delivered to ${row.mother_name} (${formattedPhone})`);
        } catch (error) {
            failedCount++;
            errors.push({
                mother: row.mother_name,
                phone: row.phone_no,
                error: error.message
            });
            console.error(`Failed to send reminder to ${row.mother_name}:`, error.message);
        }
    }

    return {
        message: "Reminder job completed",
        sent: successCount,
        failed: failedCount,
        ...(errors.length > 0 && { errors })
    };
};

module.exports = sendReminders;
