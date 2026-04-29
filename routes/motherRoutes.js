const express = require("express");
const router = express.Router();
const db = require("../db/connection");


// REGISTER MOTHER
router.post("/register", (req, res) => {

    const {
        mother_name,
        national_id,
        phone_no,
        hospital_id
    } = req.body;

    // Validate required fields
    if (!mother_name || !national_id || !phone_no || !hospital_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = `
        INSERT INTO mothers 
        (mother_name, national_id, phone_no, hospital_id, date_created)
        VALUES (?, ?, ?, ?, NOW())
    `;

    db.query(
        sql,
        [mother_name, national_id, phone_no, hospital_id],
        (err, result) => {

            if (err) {
                console.error("Database Error:", err.message);
                console.error("Full Error:", err);
                return res.status(500).json({ error: "Failed to register mother", details: err.message });
            }

            res.json({
                message: "Mother registered successfully",
                mother_id: result.insertId
            });
        }
    );
});

// SEARCH MOTHER BY PHONE AND RETURN CHILDREN
router.get("/search", (req, res) => {
    const phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({ error: "Phone number is required for search." });
    }

    const normalizedPhone = phone.replace(/[^0-9]/g, "");
    const motherSql = `
        SELECT mother_id, mother_name, national_id, phone_no, hospital_id, date_created
        FROM mothers
        WHERE REPLACE(REPLACE(REPLACE(phone_no, '+', ''), ' ', ''), '-', '') = ?
    `;

    db.query(motherSql, [normalizedPhone], (err, motherResults) => {
        if (err) {
            console.error("Error finding mother:", err);
            return res.status(500).json({ error: "Unable to search for mother right now." });
        }

        if (!motherResults || motherResults.length === 0) {
            return res.status(404).json({ error: "No mother found with that phone number." });
        }

        const mother = motherResults[0];
        const childrenSql = `
            SELECT baby_id, baby_name, date_of_birth, gender
            FROM babies
            WHERE mother_id = ?
        `;

        db.query(childrenSql, [mother.mother_id], (err, childrenResults) => {
            if (err) {
                console.error("Error fetching children:", err);
                return res.status(500).json({ error: "Unable to retrieve children for this mother." });
            }

            res.json({
                mother_id: mother.mother_id,
                mother_name: mother.mother_name,
                phone_no: mother.phone_no,
                national_id: mother.national_id,
                hospital_id: mother.hospital_id,
                children: childrenResults || []
            });
        });
    });
});

module.exports = router;