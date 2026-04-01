# Maternal Clinic Reminder System

A Node.js-based backend system designed to send automated SMS reminders to mothers and track baby vaccination schedules for maternal health clinics.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Author](#author)

---

## Project Overview

The Maternal Clinic Reminder System is a backend application built to support maternal health clinics in managing mother and baby records. It automates SMS reminders to remind mothers of upcoming clinic visits and vaccination appointments, reducing missed visits and improving healthcare outcomes.

---

## Features

- Automated SMS reminders sent to mothers via Africa's Talking API
- Baby vaccination tracking and scheduling
- Mother profile management
- Staff management
- Reminder scheduling service

---

## Tech Stack

| Technology           | Purpose             |
| -------------------- | ------------------- |
| Node.js              | Runtime environment |
| Express.js           | Web framework       |
| MySQL / PostgreSQL   | Database            |
| Africa's Talking API | SMS notifications   |

---

## Project Structure

```
Maternal Clinic Reminder/
├── db/
│   └── connection.js          # Database connection setup
├── routes/
│   ├── motherRoutes.js        # Mother management endpoints
│   ├── babyRoutes.js          # Baby records endpoints
│   ├── vaccineRoutes.js       # Vaccination tracking endpoints
│   ├── reminderRoutes.js      # Reminder management endpoints
│   └── staffRoutes.js         # Staff management endpoints
├── utils/
│   ├── reminderService.js     # Reminder scheduling logic
│   └── sendSMS.js             # Africa's Talking SMS integration
├── server.js                  # Entry point
├── package.json
└── .gitignore
```

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/sekhany6/Maternal_Clinic_Reminder_System.git
   cd Maternal_Clinic_Reminder_System
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a MySQL or PostgreSQL database
   - Update the connection settings in `db/connection.js`

4. **Configure environment variables** (see [Configuration](#configuration))

5. **Start the server**
   ```bash
   npm start
   ```

---

## Configuration

Create a `.env` file in the root directory and add the following:

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306

PORT=3000
```

> **Note:** Never commit your `.env` file. It is already included in `.gitignore`.

---

## Usage

Once the server is running, the system will:

- Expose REST API endpoints for managing mothers, babies, vaccines, staff, and reminders
- Automatically send SMS reminders to registered mothers based on scheduled appointments and vaccination dates

---

## API Endpoints

### Mothers

| Method | Endpoint                        | Description                                      |
| ------ | ------------------------------- | ------------------------------------------------ |
| POST   | `/api/mothers/register`         | Register a new mother                            |
| GET    | `/api/mothers/search?phone=...` | Search a mother by phone and return her children |

### Babies

| Method | Endpoint               | Description                                       |
| ------ | ---------------------- | ------------------------------------------------- |
| POST   | `/api/babies/register` | Register a new baby and generate vaccine schedule |

### Vaccines

| Method | Endpoint                          | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| GET    | `/api/vaccines/schedule/:baby_id` | Get vaccination schedule for a specific baby |
| GET    | `/api/vaccines/schedules`         | Get upcoming vaccination schedules           |
| GET    | `/api/vaccines/reminders`         | Get sent reminder records                    |
| POST   | `/api/vaccines/record`            | Record a completed vaccination               |

### Reminders

| Method | Endpoint                        | Description                       |
| ------ | ------------------------------- | --------------------------------- |
| GET    | `/api/reminders/send-reminders` | Trigger reminder sending manually |

### Staff

| Method | Endpoint              | Description                 |
| ------ | --------------------- | --------------------------- |
| POST   | `/api/staff/register` | Register a new staff member |
| POST   | `/api/staff/login`    | Login staff member          |

---

## Author

<<<<<<< HEAD
**Sekhany6**  
GitHub: [https://github.com/sekhany6](https://github.com/sekhany6/Maternal_Clinic_Reminder_System)
=======
MWANGI JOY WAMBUI 

GitHub: [https://github.com/sekhany6](https://github.com/sekhany6)
>>>>>>> 3107d2ea4fb098a80bc699831a5469247d61f16b

---

_Submitted as part of an academic project._
