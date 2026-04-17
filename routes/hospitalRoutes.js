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

    const hospitalsSql = `
        SELECT
            h.hospital_id,
            h.hospital_name,
            h.location,
            h.contact
        FROM hospitals h
        ORDER BY h.hospital_name ASC
    `;

    const staffSql = `
        SELECT
            s.staff_id,
            s.staff_name,
            s.role,
            s.hospital_id
        FROM staff s
        ORDER BY s.staff_name ASC
    `;

    const familiesSql = `
        SELECT
            h.hospital_id,
            m.mother_id,
            m.mother_name,
            m.phone_no,
            m.national_id,
            b.baby_id,
            b.baby_name,
            b.date_of_birth,
            b.gender
        FROM hospitals h
        LEFT JOIN mothers m ON m.hospital_id = h.hospital_id
        LEFT JOIN babies b ON b.mother_id = m.mother_id
        ORDER BY h.hospital_name ASC, m.mother_name ASC, b.date_of_birth ASC, b.baby_name ASC
    `;

    const vaccinationsSql = `
        SELECT
            h.hospital_id,
            m.mother_id,
            m.mother_name,
            b.baby_id,
            b.baby_name,
            b.date_of_birth,
            v.vaccine_id,
            v.vaccine_name,
            vs.schedule_id,
            vs.due_date,
            vs.status AS schedule_status,
            vs.completed_date,
            vr.vaccination_date,
            COALESCE(vr.status, vs.status) AS record_status
        FROM vaccination_schedule vs
        JOIN babies b ON vs.baby_id = b.baby_id
        JOIN mothers m ON b.mother_id = m.mother_id
        JOIN hospitals h ON m.hospital_id = h.hospital_id
        JOIN vaccines v ON vs.vaccine_id = v.vaccine_id
        LEFT JOIN (
            SELECT
                latest.baby_id,
                latest.vaccine_id,
                latest.vaccination_date,
                latest.status
            FROM vaccination_records latest
            INNER JOIN (
                SELECT baby_id, vaccine_id, MAX(record_id) AS latest_record_id
                FROM vaccination_records
                GROUP BY baby_id, vaccine_id
            ) grouped
                ON grouped.latest_record_id = latest.record_id
        ) vr ON vr.baby_id = vs.baby_id AND vr.vaccine_id = vs.vaccine_id
        WHERE (
            vs.due_date BETWEEN ? AND ?
            OR COALESCE(vr.vaccination_date, vs.completed_date, CASE WHEN vs.status = 'Completed' THEN vs.due_date END) BETWEEN ? AND ?
        )
        ORDER BY h.hospital_name ASC, m.mother_name ASC, b.baby_name ASC, vs.due_date ASC
    `;

    try {
        const [hospitalRows, staffRows, familyRows, vaccinationRows] = await Promise.all([
            queryAsync(hospitalsSql),
            queryAsync(staffSql),
            queryAsync(familiesSql),
            queryAsync(vaccinationsSql, [
                monthRange.startDate,
                monthRange.endDate,
                monthRange.startDate,
                monthRange.endDate
            ])
        ]);

        const hospitalMap = new Map(hospitalRows.map((hospital) => [hospital.hospital_id, {
            hospital_id: hospital.hospital_id,
            hospital_name: hospital.hospital_name,
            location: hospital.location,
            contact: hospital.contact,
            staff_count: 0,
            mother_count: 0,
            child_count: 0,
            completed_vaccinations: 0,
            pending_vaccinations: 0,
            staff_members: [],
            mothers: [],
            vaccinations: []
        }]));

        const motherMapByHospital = new Map();

        staffRows.forEach((staff) => {
            const hospital = hospitalMap.get(staff.hospital_id);
            if (!hospital) return;

            hospital.staff_members.push({
                staff_id: staff.staff_id,
                staff_name: staff.staff_name,
                role: staff.role
            });
        });

        familyRows.forEach((row) => {
            const hospital = hospitalMap.get(row.hospital_id);
            if (!hospital || !row.mother_id) return;

            if (!motherMapByHospital.has(row.hospital_id)) {
                motherMapByHospital.set(row.hospital_id, new Map());
            }

            const mothersForHospital = motherMapByHospital.get(row.hospital_id);
            if (!mothersForHospital.has(row.mother_id)) {
                mothersForHospital.set(row.mother_id, {
                    mother_id: row.mother_id,
                    mother_name: row.mother_name,
                    phone_no: row.phone_no,
                    national_id: row.national_id,
                    child_count: 0,
                    children: []
                });
            }

            const mother = mothersForHospital.get(row.mother_id);

            if (row.baby_id) {
                mother.children.push({
                    baby_id: row.baby_id,
                    baby_name: row.baby_name,
                    date_of_birth: row.date_of_birth,
                    gender: row.gender
                });
            }
        });

        vaccinationRows.forEach((row) => {
            const hospital = hospitalMap.get(row.hospital_id);
            if (!hospital) return;

            const completionDate = row.vaccination_date || row.completed_date || (row.schedule_status === "Completed" ? row.due_date : null);
            const isCompletedInMonth = row.schedule_status === "Completed"
                && completionDate
                && completionDate >= monthRange.startDate
                && completionDate <= monthRange.endDate;
            const isPendingInMonth = row.schedule_status !== "Completed"
                && row.due_date >= monthRange.startDate
                && row.due_date <= monthRange.endDate;

            if (!isCompletedInMonth && !isPendingInMonth) {
                return;
            }

            hospital.vaccinations.push({
                schedule_id: row.schedule_id,
                mother_id: row.mother_id,
                mother_name: row.mother_name,
                baby_id: row.baby_id,
                baby_name: row.baby_name,
                date_of_birth: row.date_of_birth,
                vaccine_id: row.vaccine_id,
                vaccine_name: row.vaccine_name,
                due_date: row.due_date,
                vaccination_date: completionDate,
                status: isCompletedInMonth ? "Completed" : "Pending"
            });

            if (isCompletedInMonth) {
                hospital.completed_vaccinations += 1;
            }

            if (isPendingInMonth) {
                hospital.pending_vaccinations += 1;
            }
        });

        const records = hospitalRows.map((hospital) => {
            const record = hospitalMap.get(hospital.hospital_id);
            const mothersForHospital = Array.from((motherMapByHospital.get(hospital.hospital_id) || new Map()).values())
                .map((mother) => ({
                    ...mother,
                    child_count: mother.children.length
                }));

            record.staff_count = record.staff_members.length;
            record.mothers = mothersForHospital;
            record.mother_count = mothersForHospital.length;
            record.child_count = mothersForHospital.reduce((count, mother) => count + mother.child_count, 0);

            return record;
        });

        const summary = records.reduce((acc, record) => ({
            hospitals: acc.hospitals + 1,
            staff: acc.staff + record.staff_count,
            mothers: acc.mothers + record.mother_count,
            children: acc.children + record.child_count,
            completedVaccinations: acc.completedVaccinations + record.completed_vaccinations,
            pendingVaccinations: acc.pendingVaccinations + record.pending_vaccinations
        }), {
            hospitals: 0,
            staff: 0,
            mothers: 0,
            children: 0,
            completedVaccinations: 0,
            pendingVaccinations: 0
        });

        res.json({
            month: monthRange.monthKey,
            monthLabel: monthRange.label,
            summary,
            records
        });
    } catch (error) {
        console.error("Monthly hospital records error:", error);
        res.status(500).json({
            error: "Unable to retrieve monthly hospital records right now."
        });
    }
});

module.exports = router;
