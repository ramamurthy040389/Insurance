# Insurance Policy Management System

A production-grade, high-performance Insurance Policy Management Backend built with **Node.js, Express.js, MongoDB (Mongoose), and JavaScript**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Installation & Setup](#4-installation--setup)
5. [Environment Configuration](#5-environment-configuration)
6. [MongoDB Setup & Collections](#6-mongodb-setup--collections)
7. [Database Indexing Strategy](#7-database-indexing-strategy)
8. [Running the Application](#8-running-the-application)
9. [Running Automated Tests](#9-running-automated-tests)
10. [Importing the Provided Dataset](#10-importing-the-provided-dataset)
11. [REST API Documentation & Postman](#11-rest-api-documentation--postman)
12. [Worker Thread Architecture (CPU Offloading)](#12-worker-thread-architecture-cpu-offloading)
13. [Scheduled Message Service & Background Worker](#13-scheduled-message-service--background-worker)
14. [CPU Utilization Monitoring & Graceful Restart](#14-cpu-utilization-monitoring--graceful-restart)
15. [Centralized Error Handling & Logging](#15-centralized-error-handling--logging)
16. [Production Deployment Considerations](#16-production-deployment-considerations)
17. [Assumptions & Ambiguity Documentation](#17-assumptions--ambiguity-documentation)

---

## 1. Project Overview

The **Insurance Policy Management System** provides a scalable backend for handling policy lifecycles, master entity deduplication, high-volume file ingestion, search, multi-dimensional policy aggregation, CPU utilization monitoring, and scheduled message dispatching.

### Key Capabilities

* **Asynchronous Multi-Threaded Ingestion**: Offloads CPU-intensive CSV/XLSX parsing and normalization to **Node.js Worker Threads**, ensuring the main Express.js event loop remains responsive.
* **Master Entity Normalization & Deduplication**: Intelligently extracts and reuses Agents, Users, Accounts, Policy Categories (LOB), and Policy Carriers.
* **High-Efficiency Search & Aggregation**: Utilizes native MongoDB aggregation pipelines (`$lookup`, `$group`, `$project`) avoiding N+1 queries.
* **Production CPU Utilization Monitor**: Continuously tracks CPU utilization, detects sustained high loads (>=70% across consecutive intervals), and executes a graceful shutdown sequence enabling external process orchestrators (PM2/Kubernetes) to reboot the container.
* **Concurrent-Safe Scheduled Message Processing**: Implements atomic database operations (`findOneAndUpdate`) to ensure exactly-once execution across horizontal worker instances.
* **Structured Logging & Centralized Error Handling**: Production-ready structured logging with Pino and unified error formatting with standard HTTP status codes.

---

## 2. System Architecture

```text
                               +----------------------------------------+
                               |              Client / HTTP             |
                               +----------------------------------------+
                                                   |
                                                   v
                               +----------------------------------------+
                               |     Express.js API Layer (App.js)      |
                               |  - Helmet, CORS, Rate Limiting         |
                               |  - Request Logger, Error Middleware    |
                               +----------------------------------------+
                                         /         |           \
                    POST /policies/import          |            POST /messages
                         /                         |                  \
                        v                          v                   v
            +-----------------------+    +-------------------+    +----------------------+
            |  Worker Thread Pool   |    |  Policy Service   |    |   Message Service    |
            | (import.worker.js)    |    |  - Search User    |    |  - Schedule Message  |
            | - CPU-intensive parse |    |  - Aggregation    |    |  - Worker Execution  |
            | - Master deduplication|    +-------------------+    +----------------------+
            | - Bulk write / upsert |              |                          |
            +-----------------------+              v                          v
                        \                +-------------------+    +----------------------+
                         \-------------> |  MongoDB Database | <--+ Scheduled Worker Job |
                                         |  - Normalized LOB |    | (Atomic lock claim)  |
                                         |  - Compound Index |    +----------------------+
                                         +-------------------+
                                                   ^
                                                   |
                                         +-------------------+
                                         | CPU Monitor Job   |
                                         | (pidusage 5s loop)|
                                         +-------------------+
```

### Directory Structure

```text
src/
├── config/
│   ├── database.js          # MongoDB connection manager with pooling & events
│   ├── env.js               # Typed environment variable loader with defaults
│   └── setupIndexes.js      # Automatic index synchronization helper
├── constants/
│   ├── httpStatus.js        # Standard HTTP and error codes
│   └── messageStatus.js     # Scheduled message statuses (PENDING, PROCESSING, etc.)
├── controllers/
│   ├── message.controller.js# Controller for message endpoints
│   └── policy.controller.js # Controller for import, search, and summary
├── docs/
│   └── swagger.json         # OpenAPI 3.0 specification
├── jobs/
│   ├── cpuMonitor.job.js    # CPU utilization background runner
│   └── message.job.js       # Periodic message dispatch worker runner
├── middleware/
│   ├── errorHandler.js      # Centralized error & 404 handler
│   ├── requestLogger.js     # Structured request duration and context logger
│   └── upload.js            # Multer disk upload with extension filtering
├── models/
│   ├── Account.js           # Account collection schema & indexes
│   ├── Agent.js             # Agent collection schema & indexes
│   ├── index.js             # Model registry
│   ├── Policy.js            # Policy collection schema & relational references
│   ├── PolicyCarrier.js     # PolicyCarrier collection schema
│   ├── PolicyCategory.js    # PolicyCategory (LOB) collection schema
│   ├── ScheduledMessage.js  # ScheduledMessage collection & status indexes
│   └── User.js              # User collection with normalized email index
├── repositories/
│   ├── message.repository.js# Atomic lock claim & message persistence
│   └── policy.repository.js # MongoDB aggregation pipelines
├── routes/
│   ├── index.js             # Top-level route aggregator & /health check
│   ├── message.routes.js    # /api/v1/messages routes
│   └── policy.routes.js     # /api/v1/policies routes
├── services/
│   ├── cpuMonitor.service.js# CPU evaluation & threshold trigger
│   ├── import.service.js    # Worker Thread spawner & lifecycle
│   ├── message.service.js   # Message scheduling and worker processor
│   └── policy.service.js    # Business logic for policy queries
├── utils/
│   ├── apiError.js          # Custom operational error class
│   ├── apiResponse.js       # Uniform JSON response builder
│   ├── dateUtils.js         # Robust date parsing, Excel serial & range checks
│   ├── logger.js            # Structured Pino logger with redaction
│   └── stringUtils.js       # Sanitization, email normalization & phone utils
├── workers/
│   └── import.worker.js     # Node.js Worker Thread for file ingestion
├── app.js                   # Express application setup
└── server.js                # Server entrypoint with graceful shutdown

tests/
├── integration/
│   ├── import.test.js       # Worker thread ingestion integration tests
│   ├── message.test.js      # Message scheduling & worker concurrency tests
│   └── policy.test.js       # Search & aggregation API tests
├── unit/
│   ├── cpuMonitor.test.js   # CPU spike logic unit tests
│   ├── dateUtils.test.js    # Date parsing & range validator unit tests
│   └── stringUtils.test.js  # Email & phone normalizer unit tests
├── setup.js                 # Test database connection setup/teardown
└── jest.config.js           # Test suite configuration
```

---

## 3. Prerequisites

* **Node.js**: `v18.x` or higher (tested on `v25.x` and `v20.x`)
* **MongoDB**: `v5.x` or higher (running locally on port 27017 or via MongoDB Atlas)
* **npm**: `v9.x` or higher

---

## 4. Installation & Setup

1. **Clone or Navigate to the project directory**:
   ```bash
   cd c:\xampp\htdocs\Insurance
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

---

## 5. Environment Configuration

The application is completely configurable via `.env`:

```env
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/insurance

# CPU Utilization Monitor Configuration
CPU_MONITOR_ENABLED=true
CPU_THRESHOLD_PERCENT=70
CPU_CHECK_INTERVAL_MS=5000
CPU_HIGH_USAGE_CONSECUTIVE_CHECKS=3

# Scheduled Message Job Configuration
MESSAGE_JOB_ENABLED=true
MESSAGE_JOB_INTERVAL_MS=10000

# Logging
LOG_LEVEL=info

# Rate Limiting (15 mins window, 1000 requests max)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Max Upload File Size in Bytes (default: 50MB)
MAX_FILE_SIZE_BYTES=52428800
```

---

## 6. MongoDB Setup & Collections

The data model follows clean normalized design patterns:

### 1. `Agent`
* `_id`: ObjectId
* `agent_name`: String (Unique)
* `createdAt`, `updatedAt`: Date

### 2. `User`
* `_id`: ObjectId
* `firstName`: String
* `dob`: Date (Parsed from YYYY-MM-DD or MM/DD/YYYY)
* `address`, `city`, `state`, `zipCode`: String
* `phone`: String (Normalized)
* `email`: String (Unique, normalized to lowercase)
* `gender`: String
* `userType`: String
* `createdAt`, `updatedAt`: Date

### 3. `Account`
* `_id`: ObjectId
* `accountName`: String
* `accountType`: String
* `createdAt`, `updatedAt`: Date

### 4. `PolicyCategory` (LOB)
* `_id`: ObjectId
* `categoryName`: String (Unique)
* `createdAt`, `updatedAt`: Date

### 5. `PolicyCarrier`
* `_id`: ObjectId
* `companyName`: String (Unique)
* `createdAt`, `updatedAt`: Date

### 6. `Policy`
* `_id`: ObjectId
* `policyNumber`: String (Unique business identifier)
* `policyStartDate`, `policyEndDate`: Date
* `policyMode`, `policyType`: String
* `premiumAmount`, `premiumAmountWritten`: Number
* `producer`, `csr`: String
* `agentId` -> `Agent._id`
* `accountId` -> `Account._id`
* `categoryId` -> `PolicyCategory._id`
* `companyId` -> `PolicyCarrier._id`
* `userId` -> `User._id`
* `primary`, `applicantId`, `agencyId`, `hasActiveClientPolicy`: String (Preserved source fields)
* `createdAt`, `updatedAt`: Date

### 7. `ScheduledMessage`
* `_id`: ObjectId
* `message`: String
* `scheduledAt`: Date
* `status`: `PENDING` | `PROCESSING` | `COMPLETED` | `FAILED`
* `processedAt`: Date
* `error`: String
* `createdAt`, `updatedAt`: Date

---

## 7. Database Indexing Strategy

Indexes are created intentionally to optimize exact query paths without unnecessary overhead:

| Collection | Index Fields | Type | Justification |
| :--- | :--- | :--- | :--- |
| **User** | `{ email: 1 }` | **Unique** | Enforces user deduplication and allows $O(1)$ user lookups during search and imports. |
| **User** | `{ firstName: 1 }` | Standard | Supports case-insensitive name searches in the `/search` endpoint. |
| **Account** | `{ accountName: 1, accountType: 1 }` | **Unique** | Deduplicates business accounts while distinguishing Commercial vs Personal accounts. |
| **PolicyCategory** | `{ categoryName: 1 }` | **Unique** | Ensures one document per unique LOB (e.g. Commercial Auto, Life). |
| **PolicyCarrier** | `{ companyName: 1 }` | **Unique** | Ensures one document per unique insurance company. |
| **Agent** | `{ agent_name: 1 }` | **Unique** | Enables rapid agent deduplication during bulk import. |
| **Policy** | `{ policyNumber: 1 }` | **Unique** | Business primary key; prevents duplicate policies and powers upsert operations. |
| **Policy** | `{ userId: 1 }` | Standard | Critical for `/search` and `/summary` aggregations joining policies by user. |
| **Policy** | `{ accountId: 1 }` | Standard | Accelerates `$lookup` joins from Policy to Account. |
| **Policy** | `{ categoryId: 1 }` | Standard | Accelerates `$lookup` joins from Policy to PolicyCategory. |
| **Policy** | `{ companyId: 1 }` | Standard | Accelerates `$lookup` joins from Policy to PolicyCarrier. |
| **Policy** | `{ policyStartDate: 1 }` | Standard | Optimizes range queries and temporal sorting in aggregations. |
| **Policy** | `{ policyEndDate: 1 }` | Standard | Optimizes expiration queries and active policy filtering. |
| **ScheduledMessage**| `{ status: 1, scheduledAt: 1 }` | **Compound** | Powers high-frequency atomic scheduler queries (`status = 'PENDING'` AND `scheduledAt <= now`). |

---

## 8. Running the Application

### Start Development Server
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### Health Check Endpoint
```bash
curl http://localhost:3000/health
```
Response:
```json
{
  "status": "UP",
  "timestamp": "2026-09-30T11:45:00.000Z",
  "uptime": 12.34,
  "database": "UP",
  "memoryUsage": { ... }
}
```

---

## 9. Running Automated Tests

Run the complete test suite (unit + integration tests):
```bash
npm test
```

### Test Coverage Highlights
* **41 comprehensive tests** covering:
  * Worker thread CSV/XLSX file ingestion & validation
  * Idempotency / safe re-import
  * Invalid dates & range validation (`endDate < startDate`)
  * Master entity deduplication & reference resolution
  * User policy search by email and firstName
  * Aggregated summary pipeline & pagination
  * Scheduled message creation, validation, atomic worker execution, and race condition prevention
  * CPU monitoring threshold spikes and consecutive check triggers

---

## 10. Importing the Provided Dataset

You can upload the provided source dataset `data-sheet.csv` using `curl` or Postman:

```bash
curl -X POST http://localhost:3000/api/v1/policies/import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@data-sheet.csv"
```

### Actual Import Output for Provided Dataset

```json
{
  "success": true,
  "summary": {
    "totalRows": 1198,
    "processed": 1198,
    "inserted": 1198,
    "updated": 0,
    "skipped": 0,
    "failed": 0
  },
  "entities": {
    "agents": 3,
    "users": 1149,
    "accounts": 1193,
    "categories": 19,
    "carriers": 46,
    "policies": 1198
  },
  "validationErrors": []
}
```

* Re-importing the same file is **idempotent** (no duplicate records created).

---

## 11. REST API Documentation & Postman

### Interactive Swagger UI
Explore and execute API requests directly via Swagger UI:
👉 **`http://localhost:3000/api-docs`**

### Postman Collection
Import the ready-to-use Postman Collection located at:
📁 **`docs/Insurance_Policy_Management.postman_collection.json`**

---

### Endpoint Specifications

#### 1. Bulk Import Policies
* **Method**: `POST`
* **Path**: `/api/v1/policies/import`
* **Content-Type**: `multipart/form-data`
* **Body**: `file` (CSV or XLSX)
* **Response**: `200 OK` with import summary and entity breakdown.

#### 2. Search Policy By User
* **Method**: `GET`
* **Path**: `/api/v1/policies/search?username=<email_or_firstname>`
* **Examples**:
  * `GET /api/v1/policies/search?username=madler@yahoo.ca`
  * `GET /api/v1/policies/search?username=Lura`
* **Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "id": "674ba01f82...",
    "firstName": "Lura Lucca",
    "email": "madler@yahoo.ca",
    "phone": "8677356559",
    "city": "MOCKSVILLE",
    "state": "NC",
    "zipCode": "27028",
    "userType": "Active Client"
  },
  "policies": [
    {
      "id": "674ba02082...",
      "policyNumber": "YEEX9MOIBU7X",
      "policyStartDate": "2018-11-02",
      "policyEndDate": "2019-11-02",
      "policyType": "Single",
      "policyMode": "12",
      "premiumAmount": 1180.83,
      "producer": "Brandie Placencia",
      "csr": "Tami Ellison",
      "account": {
        "id": "674ba01f82...",
        "name": "Lura Lucca & Owen Dodson",
        "type": "Commercial"
      },
      "carrier": {
        "id": "674ba01f82...",
        "name": "Integon Gen Ins Corp"
      },
      "category": {
        "id": "674ba01f82...",
        "name": "Commercial Auto"
      },
      "agent": {
        "id": "674ba01f82...",
        "name": "Alex Watson"
      }
    }
  ]
}
```

#### 3. Aggregated Policy Summary
* **Method**: `GET`
* **Path**: `/api/v1/policies/summary?limit=10&page=1`
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "674ba01f82...",
      "firstName": "Lura Lucca",
      "email": "madler@yahoo.ca",
      "totalPolicies": 2,
      "categories": [
        "Commercial Auto"
      ],
      "carriers": [
        "Integon Gen Ins Corp"
      ],
      "firstPolicyStartDate": "2018-11-02",
      "lastPolicyEndDate": "2020-11-02",
      "totalPremium": 2361.66
    }
  ]
}
```

#### 4. Schedule a Message
* **Method**: `POST`
* **Path**: `/api/v1/messages`
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "message": "Policy renewal reminder",
  "day": "2026-10-05",
  "time": "10:30"
}
```
* **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Message scheduled successfully",
  "data": {
    "id": "674ba030...",
    "message": "Policy renewal reminder",
    "scheduledAt": "2026-10-05T10:30:00.000Z",
    "status": "PENDING",
    "createdAt": "2026-09-30T11:46:00.000Z"
  }
}
```

---

## 12. Worker Thread Architecture (CPU Offloading)

File parsing for large datasets (e.g. 50MB+ CSV/XLSX spreadsheets) is CPU-bound. If done on the main thread, the Node.js event loop blocks, delaying all other HTTP requests.

### Our Solution
1. Express accepts the multipart file upload via `multer` into a temporary staging folder.
2. `import.service.js` spawns a dedicated worker (`src/workers/import.worker.js`) via `worker_threads.Worker`.
3. The worker parses the stream, validates records, preloads in-memory entity lookup maps to avoid N+1 database queries, deduplicates master entities, and issues bulk upsert operations.
4. The worker transmits structured summaries back to the parent thread via `parentPort.postMessage()` and cleans up temporary disk files.
5. The main thread remains 100% non-blocking.

---

## 13. Scheduled Message Service & Background Worker

### Concurrency & Race Condition Prevention
When multiple instances of the backend run horizontally in production (or across multiple worker processes), two instances might attempt to process the same pending message simultaneously.

To guarantee **exactly-once execution**, our repository uses an **atomic MongoDB operation**:

```javascript
ScheduledMessage.findOneAndUpdate(
  {
    status: 'PENDING',
    scheduledAt: { $lte: new Date() }
  },
  {
    $set: {
      status: 'PROCESSING',
      processedAt: new Date()
    }
  },
  {
    sort: { scheduledAt: 1 },
    new: true
  }
);
```

* MongoDB row-level locks ensure only one instance receives the message document.
* After processing (e.g. email/SMS dispatch), status transitions to `COMPLETED` (or `FAILED` with error details).

---

## 14. CPU Utilization Monitoring & Graceful Restart

### Monitor Design
* The monitor inspects the process CPU utilization every `CPU_CHECK_INTERVAL_MS` (5000ms) using `pidusage`.
* If CPU utilization is >= `CPU_THRESHOLD_PERCENT` (70%) for `CPU_HIGH_USAGE_CONSECUTIVE_CHECKS` (3 checks in a row), a critical threshold breach is detected.
* Single momentary spikes are ignored; if CPU normalizes, the consecutive counter resets.

### Graceful Shutdown & Production Supervisor Integration
Instead of an abrupt `process.exit()`, the application executes a graceful shutdown sequence:
1. **Stop accepting new HTTP connections** (`server.close()`).
2. **Halt background jobs** (stops message worker & CPU monitor timers).
3. **Allow in-flight requests to finish**.
4. **Close MongoDB database connections gracefully**.
5. **Log the restart event**.
6. **Exit with code 1**, signaling the external process manager to restart the service:
   * **PM2**: Automatically restarts processes exiting with non-zero codes (`pm2 start src/server.js -i max`).
   * **Kubernetes**: Liveness/readiness probe failure restarts pod with zero downtime.
   * **Docker**: `restart: unless-stopped` automatically boots a clean container instance.

---

## 15. Centralized Error Handling & Logging

* **Standard Error Response Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": ["Field 'email' is required"]
  }
}
```
* Centralized handling for `400 Bad Request`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, and `500 Internal Server Error`.
* **Structured Logger (Pino)**:
  * Automatic redaction of sensitive headers and tokens (`req.headers.authorization`, `password`, `token`, `secret`).
  * Request correlation IDs (`reqId`) for distributed request tracing.

---

## 16. Production Deployment Considerations

* **Horizontal Scaling & Load Balancing**: Stateless API layer behind NGINX / AWS ALB.
* **Queue Upgrades**: For multi-million row files or heavy external messaging, transition background jobs from internal timer to Redis-backed **BullMQ**.
* **MongoDB Connection Pooling**: Configured with `minPoolSize: 10`, `maxPoolSize: 50`, `socketTimeoutMS: 45000`.
* **Security & Hardening**:
  * `helmet` for security headers.
  * `express-rate-limit` for DDoS & brute force mitigation.
  * File size limits (50MB) and strict MIME/extension whitelisting.

---

## 17. Assumptions & Ambiguity Documentation

As required by the assessment, the following business ambiguities in the source data have been documented:

### 1. User Identity Strategy
* **Selected Business Key**: `normalized email` (`lowercase + trimmed`).
* **Rationale**: In insurance systems, primary communication and policy binding tie to the insured individual's email.
* **Handling Missing/Conflicting Emails**: If an email is empty or invalid, the row is flagged in `validationErrors` without terminating the rest of the import.

### 2. Account Identity Strategy
* **Selected Key**: `accountName + accountType` (e.g. `"Lura Lucca & Owen Dodson | Commercial"`).
* **Rationale**: A client may hold both a Commercial Account and a Personal Account under the same name. Storing them as distinct accounts prevents cross-contamination of business lines.

### 3. Agent vs Producer vs CSR vs Agency ID
* **Agent**: Normalized into the `Agent` master collection (`agent_name` unique).
* **Producer & CSR**: Stored on the `Policy` document directly as policy-level assignees, reflecting that producers and CSRs can vary per policy.
* **Agency ID**: Preserved on the `Policy` document for auditing and broker reconciliation.

### 4. Additional Source Fields (`primary`, `Applicant ID`, `agency_id`, `hasActive ClientPolicy`)
* These fields are preserved directly on the `Policy` schema (`primary`, `applicantId`, `agencyId`, `hasActiveClientPolicy`).
* No artificial values are fabricated for missing rows.

### 5. Username Search Interpretation
* The `/api/v1/policies/search?username=...` endpoint supports:
  1. Exact matching on `normalized email` (e.g. `madler@yahoo.ca`).
  2. Case-insensitive matching on `firstName` (e.g. `Lura` or `lura`).

### 6. Scheduled Message Delivery Mechanism
* The service implements an extensible delivery dispatcher. In development, it logs the delivery action.
* In production, this handler cleanly plugs into SendGrid (Email), Twilio (SMS), or Firebase Cloud Messaging (FCM).

### 7. CPU Restart Strategy
* The application triggers a graceful shutdown sequence and terminates.
* In production environments, container orchestrators (Kubernetes / Docker) or process supervisors (PM2 / systemd) detect process termination and immediately spawn a fresh instance.

### 8. Target MongoDB Collection Names (Compass / Shell Exact Matching)
As verified in the system architecture, all schemas explicitly specify their target collection name:
* `User` -> `users`
* `Agent` -> `agents`
* `Account` -> `accounts`
* `PolicyCategory` -> `policycategories`
* `PolicyCarrier` -> `policycarriers`
* `Policy` -> `policies`
* `ScheduledMessage` -> `scheduledmessages`

### 9. Flexible CSV Header Normalization & Field Mapping
The data import pipeline accepts diverse header variations (e.g., snake_case, camelCase, Title Case with spaces, or UTF-8 BOM prefixes) by canonicalizing all header keys:
* **User Profile**:
  * `firstName`: `['firstname', 'first_name', 'firstName', 'first name', 'username', 'name']`
  * `dob`: `['dob', 'date_of_birth', 'birthdate', 'birth_date', 'dateofbirth']` (ISO, YYYY-MM-DD, MM/DD/YYYY, and Excel serial dates)
  * `email`: `['email', 'useremail', 'user_email', 'email_address']` (normalized, trimmed, lowercased)
  * `phone`: `['phone', 'phonenumber', 'phone_number', 'mobile', 'telephone']`
  * `address`: `['address', 'street_address', 'street', 'address_line_1']`
  * `city`: `['city', 'city_name']`
  * `state`: `['state', 'state_code', 'province']`
  * `zipCode`: `['zip', 'zipcode', 'zip_code', 'postal_code']`
  * `gender`: `['gender', 'sex']`
  * `userType`: `['usertype', 'user_type', 'client_type']` (defaults to `'Active Client'`)
* **Referential Integrity**:
  * Master entities (`agents`, `users`, `accounts`, `policycategories`, `policycarriers`) are deduplicated and inserted first via idempotent bulk write operations.
  * Every policy is verified for non-null `userId`, `accountId`, `categoryId`, and `companyId` before insertion.
  * Detailed logs are emitted across all import stages (`[PARSE]`, `[NORMALIZE]`, `[DEDUP]`, `[INSERT]`, `[VERIFY]`).

