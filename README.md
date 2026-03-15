# 💊 Healthline — Pharmacy Management System

A full-stack pharmacy management application built with **FastAPI** and **React**, designed to streamline medicine inventory, sales, and stock tracking.

---

## Features

- **Dashboard** — Overview of medicines, active batches, and profit reports (daily/weekly/monthly)
- **POS (Point of Sale)** — Quick sales with cart, discount, customer name, and bill printing
- **Medicines** — Browse, search, edit, delete medicines with image support and alternative suggestions
- **Stock In** — Batch-based stock entry with auto-suggest, image upload, and draft saving
- **Stock Out** — Track outgoing stock and sales history
- **Expiring Soon** — Alerts for medicines nearing expiration
- **Top Selling** — Analytics on best-selling medicines
- **Low Stock Alerts** — Visual indicators when stock falls below 10 units

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | FastAPI, SQLAlchemy, Pydantic     |
| Database  | PostgreSQL                        |
| Frontend  | React, Vite                       |
| Migrations| Alembic                           |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend Setup

```bash
cd healthline
conda activate healthline  # or your preferred environment
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8765 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://username:password@localhost:5433/healthline
```

---

## Project Structure

```
healthline/
├── backend/
│   ├── main.py            # FastAPI app entry point
│   ├── database.py        # Database connection
│   ├── config.py          # App configuration
│   ├── models/            # SQLAlchemy models
│   ├── routers/           # API route handlers
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
├── frontend/
│   └── src/
│       ├── api.js         # API client
│       ├── App.jsx        # Root component
│       ├── components/    # Shared components
│       └── pages/         # Page components
├── alembic/               # Database migrations
├── uploads/               # Uploaded images
├── requirements.txt
└── README.md
```

---

## License

This project is for personal/internal use.
