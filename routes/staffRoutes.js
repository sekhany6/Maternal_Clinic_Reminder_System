const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const bcrypt = require("bcrypt");
const { validatePassword, validateEmail } = require("../utils/validation");

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/"
};

// REGISTER STAFF
router.post("/register", async (req, res) => {

    const {
        staff_name,
        email,
        password,
        role,
        hospital_id
    } = req.body;

    // Validate required fields
    if (!staff_name || !email || !password || !role || !hospital_id) {
        return res.status(400).json({
            error: "Missing required fields. Please provide staff_name, email, password, role, and hospital_id."
        });
    }

    // VALIDATE EMAIL
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return res.status(400).json({
            error: emailValidation.error
        });
    }

    // VALIDATE PASSWORD
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({
            error: passwordValidation.error
        });
    }

try {
    // CHECK IF EMAIL ALREADY EXISTS
    const results = await new Promise((resolve, reject) => {
        db.query("SELECT staff_id FROM staff WHERE email = ?", [email], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    if (results.length > 0) {
        return res.status(409).json({
            error: "A staff member with this email already exists."
        });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed:", hashedPassword); // ← confirm this prints in terminal

    const sql = `INSERT INTO staff (staff_name, email, password, role, hospital_id) VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [staff_name, email, hashedPassword, role, hospital_id], (err) => {
        if (err) {
            console.error("DB insert error:", err);
            return res.status(500).json({ error: "Failed to register staff." });
        }
        res.json({ message: "Staff registered successfully" });
    });

} catch (error) {
    console.error("Registration error:", error); // ← this will show what's going wrong
    res.status(500).json({ error: "Unexpected error during registration." });
}

});
// LOGIN STAFF
router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({
            error: "Missing email or password. Please provide both to login."
        });
    }

    const sql = "SELECT * FROM staff WHERE email = ?";

    try {
        const results = await new Promise((resolve, reject) => {
            db.query(sql, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // CHECK IF USER EXISTS
        if (!results || results.length === 0) {
            return res.status(404).json({
                error: "No staff account found with that email. Please register first."
            });
        }

        const staff = results[0];

        // COMPARE PASSWORD
        const isMatch = await bcrypt.compare(password, staff.password);

        if (!isMatch) {
            return res.status(401).json({
                error: "Incorrect password. Please try again."
            });
        }

        // SET HASHED PASSWORD IN COOKIE (secure storage)
        res.cookie("staffAuth", staff.password, {
            ...authCookieOptions,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // SUCCESS
        res.json({
            message: "Login successful",
            staff: {
                staff_id: staff.staff_id,
                staff_name: staff.staff_name,
                email: staff.email,
                role: staff.role,
                hospital_id: staff.hospital_id
            }
        });
    } catch (err) {
        console.error("Staff login error:", err);
        res.status(500).json({
            error: "An unexpected error occurred while attempting to login. Please try again later."
        });
    }

});

router.post("/logout", (req, res) => {
    res.clearCookie("staffAuth", authCookieOptions);
    res.json({ message: "Logout successful" });
});

module.exports = router;
