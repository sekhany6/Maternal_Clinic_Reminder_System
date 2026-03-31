const express = require("express");
const router = express.Router();
const db = require("../db/connection");


// REGISTER BABY
router.post("/register", (req, res) => {

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

    const createBaby = (resolvedMotherId) => {
        db.query(insertBaby, [baby_name, date_of_birth, gender, resolvedMotherId], (err, result) => {

            if (err) {
                console.error('Database error while registering baby:', err);
                return res.status(500).json({ error: "Failed to register baby. Please ensure all required fields are provided and the mother exists." });
            }

            const babyId = result.insertId;

            // GET VACCINES
            db.query("SELECT * FROM vaccines", (err, vaccines) => {

                if (err) {
                    console.error('Error fetching vaccines:', err);
                    return res.status(500).json({ error: "Unable to retrieve vaccine information from the database. Please try again later." });
                }

                vaccines.forEach(vaccine => {

                    const dueDate = new Date(date_of_birth);
                    dueDate.setDate(dueDate.getDate() + vaccine.interval_days);

                    const scheduleSql = `
                        INSERT INTO vaccination_schedule
                        (baby_id, vaccine_id, due_date, status, reminder_sent)
                        VALUES (?, ?, ?, 'Pending', 0)
                    `;

                    db.query(scheduleSql, [
                        babyId,
                        vaccine.vaccine_id,
                        dueDate
                    ], (err) => {
                        if (err) {
                            console.error('Error inserting vaccine schedule for', vaccine.vaccine_name, ':', err);
                        }
                    });
                });

                res.json({
                    message: "Baby registered and vaccine schedule generated",
                    baby_id: babyId
                });

            });

        });
    };

    if (!mother_id) {
        db.query("SELECT mother_id FROM mothers WHERE phone_no = ?", [mother_phone], (err, results) => {
            if (err) {
                console.error('Error looking up mother by phone:', err);
                return res.status(500).json({ error: "Error finding mother by phone number." });
            }
            if (!results || results.length === 0) {
                return res.status(404).json({ error: "No mother found with that phone number." });
            }

            createBaby(results[0].mother_id);
        });
    } else {
        createBaby(mother_id);
    }

});

module.exports = router;