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
        (mother_name, national_id, phone_no, hospital_id)
        VALUES (?, ?, ?, ?)
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

module.exports = router;