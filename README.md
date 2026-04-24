# Inventory Management System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.x-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker\&logoColor=white)](https://www.docker.com/)

A high-performance, distributed Inventory Management System developed during my internship (PKL). This system is designed to handle heavy workloads through asynchronous processing, centralized object storage, and efficient caching strategies.

---

## 🌟 Key Features

* **Automated Image Processing:** High-quality image compression and resizing using **Sharp** to save storage costs without losing clarity.
* **Message Queuing:** Offloading intensive tasks (like image processing and reporting) to **RabbitMQ** background workers.
* **S3-Compatible Storage:** Integration with **MinIO** for scalable and secure product asset management.
* **Distributed Caching:** **Redis** implementation for session management and frequently accessed data to minimize database latency.
* **Dockerized Environment:** Fully containerized setup for consistent development and seamless production deployment.
* **Security:** CSRF protection, session encryption, and secure environment variable management.

---

## 🏗 System Architecture

The application follows a **Producer-Consumer** pattern to ensure the main API remains responsive.

1. **Producer (Web Server):** Receives product data and uploads images.
2. **Queue (RabbitMQ):** Stores image processing tasks in a durable queue.
3. **Consumer (Worker):** Picks up tasks, processes images via **Sharp**, and uploads the final results to **MinIO**.
4. **Database (MongoDB):** Stores structured metadata and stock information.

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Template Engine:** EJS (Embedded JavaScript)
* **Database:** MongoDB (Mongoose ODM)
* **Cache & Store:** Redis
* **Message Broker:** RabbitMQ
* **Object Storage:** MinIO
* **Utilities:** Sharp (Image Processing), Tesseract.js (Planned/OCR)

---

## 🚦 Getting Started

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Git](https://git-scm.com/)

---

### Installation

1. **Clone the repository:**

   ```bash
   https://github.com/F1D02310092/pkl_inventaris.git
   npm install
   ```

2. **Configure Environment Variables:**

   Create a `.env` file in the root directory:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=production
   BASE_URL=http://localhost:3000

   # Database (MongoDB)
   MONGO_URI=mongodb://admin:password@mongodb:27017/inventory?authSource=admin

   # Message Broker (RabbitMQ)
   RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672

   # Distributed Cache (Redis)
   REDIS_URI=redis://redis:6379

   # Object Storage (MinIO)
   MINIO_ENDPOINT=minio
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=your-key
   MINIO_SECRET_KEY=your-key

   # Security
   SESSION_SECRET=your_very_secure_random_string_here
   ```

3. **Launch with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

---

## 📁 Project Structure

```text
├── src/
│   ├── app.js          # Main entry point
│   ├── config/         # Database, Redis, MinIO, and RabbitMQ configs
│   ├── controllers/    # Business logic for each route
│   ├── helper/ 
│   ├── models/         # Mongoose schemas (Items, Categories, Users)
│   ├── middleware/     # Authentication & error handling
│   ├── public/         # Static assets (CSS, JS)
│   ├── security/       # Security implementations 
│   └── views/          # EJS templates for the dashboard
│
├── workers/        # RabbitMQ consumers for Sharp processing
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🛡 Security Practices

* **Environment Isolation:** Credentials are never hardcoded and are managed via `.env`.
* **Statelessness:** Files are stored in MinIO, not on the server's local disk, allowing for horizontal scaling.
* **Input Validation:** All incoming data is sanitized and validated before hitting the database.


