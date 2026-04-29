-- Migration Script: Add date_created columns to all tables
-- Run this script to add date_created timestamps to existing tables

-- Add date_created to mothers table
ALTER TABLE mothers 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to babies table
ALTER TABLE babies 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to vaccination_records table
ALTER TABLE vaccination_records 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to vaccination_schedule table
ALTER TABLE vaccination_schedule 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to hospitals table
ALTER TABLE hospitals 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to staff table
ALTER TABLE staff 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to vaccines table
ALTER TABLE vaccines 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date_created to reminder_records table
ALTER TABLE reminder_records 
ADD COLUMN date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify the changes
SELECT 'mothers' AS table_name, COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'mothers' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'babies', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'babies' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'vaccination_records', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'vaccination_records' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'vaccination_schedule', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'vaccination_schedule' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'hospitals', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'hospitals' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'staff', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'staff' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'vaccines', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'vaccines' 
AND COLUMN_NAME = 'date_created'
UNION ALL
SELECT 'reminder_records', COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'maternal_clinic_reminder' 
AND TABLE_NAME = 'reminder_records' 
AND COLUMN_NAME = 'date_created';