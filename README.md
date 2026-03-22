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

AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_africas_talking_username

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

| Method | Endpoint           | Description            |
| ------ | ------------------ | ---------------------- |
| GET    | `/api/mothers`     | Get all mothers        |
| POST   | `/api/mothers`     | Register a new mother  |
| GET    | `/api/mothers/:id` | Get a specific mother  |
| PUT    | `/api/mothers/:id` | Update mother details  |
| DELETE | `/api/mothers/:id` | Delete a mother record |

### Babies

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/api/babies`     | Get all baby records |
| POST   | `/api/babies`     | Add a new baby       |
| GET    | `/api/babies/:id` | Get a specific baby  |

### Vaccines

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| GET    | `/api/vaccines` | Get all vaccines     |
| POST   | `/api/vaccines` | Add a vaccine record |

### Reminders

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| GET    | `/api/reminders` | Get all reminders |
| POST   | `/api/reminders` | Create a reminder |

### Staff

| Method | Endpoint     | Description        |
| ------ | ------------ | ------------------ |
| GET    | `/api/staff` | Get all staff      |
| POST   | `/api/staff` | Add a staff member |

---

## Author

MWANGI JOY WAMBUI 

GitHub: [https://github.com/sekhany6](https://github.com/sekhany6)

---

_Submitted as part of an academic project._
