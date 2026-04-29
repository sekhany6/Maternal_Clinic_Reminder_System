const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const db = require("./db/connection");

// ROUTE FILES
const motherRoutes = require("./routes/motherRoutes");
const babyRoutes = require("./routes/babyRoutes");
const staffRoutes = require("./routes/staffRoutes");
const vaccineRoutes = require("./routes/vaccineRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser()); // Middleware for parsing cookies
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/images", express.static(path.join(__dirname, "images")));


// CONNECT ROUTES
app.use("/api/mothers", motherRoutes);
app.use("/api/babies", babyRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/vaccines", vaccineRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/payments", paymentRoutes);

// HOME ROUTE
app.get("/", (req, res) => {
  res.send("Maternal Clinic Reminder System Running");
});


// DATABASE TEST ROUTE
app.get("/test-db", (req, res) => {

  db.query("SELECT 1", (err, result) => {

    if (err) {
      return res.status(500).json({
        message: "Database connection failed",
        error: err
      });
    }

    res.json({
      message: "Database connected successfully",
      result: result
    });

  });

});
// SCHEDULED JOB FOR REMINDERS
const cron = require("node-cron");
const sendReminders = require("./utils/reminderService");

cron.schedule("* * * * *", async () => {
  console.log("Running reminder job...");

   try {
    const result = await sendReminders();
    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
