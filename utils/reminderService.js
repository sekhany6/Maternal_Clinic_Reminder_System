const db = require("../db/connection");
const sendSMS = require("./sendSMS");

// Promisify db.query so we can properly await all queries
const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

// Format phone number to international format for TextSMS 
const formatPhone = (phone) => {
    phone = phone.trim();
    if (phone.startsWith("0")) {
        return "254" + phone.slice(1); // Change 254 to your country code if needed
    }
    if (phone.startsWith("+254") && !phone.startsWith("+")) {
        return phone.slice(1); // Remove the + if it exists, since TextSMS expects just the country code and number
    }
    return phone;
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

    // Use queryAsync for the main SELECT too, keeping code consistent
    const results = await queryAsync(sql, []);

    if (results.length === 0) {
        return { message: "No reminders to send today" };
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let row of results) {

        try {

            const formattedPhone = formatPhone(row.phone_no);
            console.log(`Formatted phone: ${formattedPhone}`); // should print 254111390052
        


            // Format due_date cleanly (removes time portion if present)
            const dueDate = new Date(row.due_date).toDateString();

            const smsMessage = `Hello ${row.mother_name}, your child ${row.baby_name} is due for ${row.vaccine_name} on ${dueDate}. Please visit the clinic.`;

            // SEND SMS
            await sendSMS(formattedPhone, smsMessage);

            // Record the reminder as sent
            await queryAsync(`
                 INSERT INTO reminder_records
                 (mother_id, phone_no, reminder_sent, message_status)
                 VALUES (?, ?, CURDATE(), 'Sent')
                `, [row.mother_id, row.phone_no]);

            // Await UPDATE so it completes before moving to the next row
            await queryAsync(`
                UPDATE vaccination_schedule
                SET reminder_sent = 1
                WHERE schedule_id = ?
            `, [row.schedule_id]);

            successCount++;
            console.log(` Reminder sent to ${row.mother_name} (${formattedPhone})`);

        } catch (error) {
            // Don't stop the whole loop if one SMS fails; log and continue
            failedCount++;
            errors.push({
                mother: row.mother_name,
                phone: row.phone_no,
                error: error.message
            });
            console.error(`❌ Failed to send reminder to ${row.mother_name}:`, error.message);
        }

    }

    return {
        message: "Reminder job completed",
        sent: successCount,
        failed: failedCount,
        ...(errors.length > 0 && { errors }) // Only include errors array if there were failures
    };

};

module.exports = sendReminders;
