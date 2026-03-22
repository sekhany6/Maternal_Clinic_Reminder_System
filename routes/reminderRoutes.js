const express = require("express");
const router = express.Router();
const sendReminders = require("../utils/reminderService");

// SIMPLE ROUTE
router.get("/send-reminders", async (req, res) => {
    try {
        const result = await sendReminders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to send reminders" });
    }
});

module.exports = router;