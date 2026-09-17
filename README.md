# ClinicFlow AI 🏥

**AI-Powered Clinic Management & Appointment Platform**

ClinicFlow AI is a full-stack clinic management platform designed to streamline appointment scheduling, patient management, doctor workflows, consultations, payments, notifications, and administrative operations.

The platform provides separate workflows for **Patients, Doctors, and Administrators**, with authentication and role-based access control protecting application resources.

## ✨ Features

### 👤 Authentication & Authorization

* JWT-based authentication
* Password hashing with bcrypt
* Role-Based Access Control (RBAC)
* Separate access for:

  * Patient
  * Doctor
  * Admin
* Protected API routes
* Audit logging for important actions

### 📅 Appointment Management

* Doctor availability management
* Working hours and lunch-break configuration
* Appointment booking
* Appointment cancellation
* Appointment rescheduling
* Daily booking limits
* Conflict prevention through scheduling rules
* Appointment status and payment status tracking

### 🤖 AI Appointment Assistant

* Gemini-powered conversational assistant
* Natural-language appointment requests
* Appointment booking assistance
* Rescheduling and cancellation assistance
* Patient support through conversational interactions
* Conversation history and memory
* Tool-based AI actions for interacting with application services

### 👨‍⚕️ Doctor & Patient Management

* Doctor profiles and specialties
* Patient profiles
* Doctor appointment management
* Patient appointment history
* Consultation records
* Diagnosis and doctor notes
* Follow-up dates
* Prescription management

### ⚡ Real-Time Communication

* Socket.IO-based real-time communication
* Live updates for application dashboards
* Event-driven frontend updates without requiring manual page refreshes

### 💳 Payments

* Payment workflow integrated into appointment management
* Stripe payment support
* Cash payment option
* Payment status tracking
* Payment records associated with appointments
* Refund-related payment states

### 🔔 Notifications & Background Jobs

* Appointment notification records
* Notification status tracking
* BullMQ-based background job infrastructure
* Redis support for queue processing

### 📊 Analytics & Administration

* Administrative dashboard
* Clinic configuration management
* Analytics APIs
* Audit logs for important system actions

### 🛡️ Security & Reliability

* JWT authentication
* RBAC authorization
* bcrypt password hashing
* Helmet security middleware
* Express rate limiting
* Zod-based validation
* Centralized error handling
* Structured logging
* Audit logging

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │   Vite + TypeScript │
                    └──────────┬──────────┘
                               │
                         REST / HTTP
                               │
                    ┌──────────▼──────────┐
                    │   Express Backend   │
                    │   Node.js + TS      │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼─────┐   ┌──────▼──────┐  ┌─────▼─────┐
       │ JWT + RBAC │   │   Services  │  │ Socket.IO │
       └────────────┘   └──────┬──────┘  └───────────┘
                               │
                       ┌───────▼────────┐
                       │ Prisma ORM     │
                       └───────┬────────┘
                               │
                       ┌───────▼────────┐
                       │ SQLite Database│
                       └────────────────┘

       ┌────────────────┐
       │   Gemini AI    │
       │  Agent + Tools │
       └───────┬────────┘
               │
               ▼
       Appointment / Scheduling
             Services

       ┌────────────────┐
       │ BullMQ + Redis │
       │ Background Jobs│
       └────────────────┘

       ┌────────────────┐
       │ Stripe Payment │
       └────────────────┘
```

---

## 🧰 Technology Stack

### Frontend

* React
* TypeScript
* Vite
* React Router
* TanStack React Query
* Zustand
* Axios
* Tailwind CSS
* Framer Motion
* Radix UI
* Socket.IO Client

### Backend

* Node.js
* Express.js
* TypeScript
* REST APIs
* JWT
* bcrypt
* Zod
* Helmet
* Express Rate Limit
* Winston
* Socket.IO

### Database

* SQLite
* Prisma ORM
* Prisma Migrations

### AI

* Google Gemini API
* Custom AI Agent
* Tool Registry / Tool Executor
* Conversation Memory
* Prompt Management

### Background Processing

* BullMQ
* Redis
* IORedis

### Payments

* Stripe payment workflow

### Development & Deployment

* Git
* GitHub
* Docker
* Docker Compose
* GitHub Actions

---

## 🗄️ Data Model

The application uses Prisma ORM with SQLite.

Major entities include:

```text
User
 └── AuditLog

Doctor
 ├── Appointment
 └── Consultation

Patient
 ├── Appointment
 ├── Conversation
 └── Consultation

Appointment
 ├── Payment
 ├── Notification
 └── Consultation

Consultation
 └── Prescription
```

Important models include:

* User
* Doctor
* Patient
* Appointment
* Payment
