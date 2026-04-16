const express = require("express");
const router = express.Router();
const db = require("../db/connection");

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
    });
});

const getMonthRange = (monthValue) => {
    const fallbackDate = new Date();
    const selectedDate = monthValue
        ? new Date(`${monthValue}-01T00:00:00`)
        : new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);

    if (Number.isNaN(selectedDate.getTime())) {
        return null;
    }

    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth();
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    const pad = (value) => String(value).padStart(2, "0");

    return {
        monthKey: `${year}-${pad(monthIndex + 1)}`,
        startDate: `${year}-${pad(monthIndex + 1)}-01`,
        endDate: `${year}-${pad(monthIndex + 1)}-${pad(endDate.getDate())}`,
        label: startDate.toLocaleString("en-US", { month: "long", year: "numeric" })
    };
};

router.get("/monthly-records", async (req, res) => {
    const monthRange = getMonthRange(req.query.month);

    if (!monthRange) {
        return res.status(400).json({
            error: "Invalid month format. Use YYYY-MM."
        });
    }

    const sql = `
        SELECT
            h.hospital_id,
            h.hospital_name,
            h.location,
            h.contact,
            (
                SELECT COUNT(*)
                FROM staff s
                WHERE s.hospital_id = h.hospital_id
            ) AS staff_count,
            (
                SELECT COUNT(*)
                FROM mothers m
                WHERE m.hospital_id = h.hospital_id
            ) AS mother_count,
            (
                SELECT COUNT(*)
                FROM babies b
                JOIN mothers m ON b.mother_id = m.mother_id
                WHERE m.hospital_id = h.hospital_id
            ) AS child_count,
            (
                SELECT COUNT(*)
                FROM vaccination_schedule vs
                JOIN babies b ON vs.baby_id = b.baby_id
                JOIN mothers m ON b.mother_id = m.mother_id
                WHERE m.hospital_id = h.hospital_id
                  AND vs.status = 'Completed'
                  AND vs.completed_date BETWEEN ? AND ?
            ) AS completed_vaccinations
        FROM hospitals h
        ORDER BY h.hospital_name ASC
    `;

    try {
        const rows = await queryAsync(sql, [monthRange.startDate, monthRange.endDate]);
        const summary = rows.reduce((acc, row) => ({
            hospitals: acc.hospitals + 1,
            staff: acc.staff + Number(row.staff_count || 0),
            mothers: acc.mothers + Number(row.mother_count || 0),
            children: acc.children + Number(row.child_count || 0),
            completedVaccinations: acc.completedVaccinations + Number(row.completed_vaccinations || 0)
        }), {
            hospitals: 0,
            staff: 0,
            mothers: 0,
            children: 0,
            completedVaccinations: 0
        });

        res.json({
            month: monthRange.monthKey,
            monthLabel: monthRange.label,
            summary,
            records: rows
        });
    } catch (error) {
        console.error("Monthly hospital records error:", error);
        res.status(500).json({
            error: "Unable to retrieve monthly hospital records right now."
        });
    }
});

module.exports = router;
