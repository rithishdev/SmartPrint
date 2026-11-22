# SmartPrint: Campus Printing & Queue Management System

**Course:** 26ECC01 - Engineering Innovation and Design Thinking Lab (First Review)  
**Institution:** Sri Krishna College of Engineering and Technology (SKCET), Coimbatore  
**Department:** Artificial Intelligence and Data Science (AI&DS)  
**Batch:** 9 (FN Session, Date: 03/11/2026)  

### Batch Team Members:
- **Yasvanth V** - 26AD470
- **Mithun G** - 26AD480
- **Yeshwanth K** - 26AD471
- **Fathrul Haq F** - 26AD478

---

## 🌟 Features Overview

### 1. 🎓 Project Review Hub (Complete 16-Slide Interactive Showcase)
- **Problem Statement & Impact:** Loss of break time, counter congestion, and order mix-ups.
- **Objectives:** Complete digital workflow for student ordering and queue visibility.
- **Sustainable Development Goals (SDGs):**
  - **SDG 9** (Industry, Innovation & Infrastructure) - Campus service digitization.
  - **SDG 12** (Responsible Consumption & Production) - Duplex saving & print preview to avoid reprints.
  - **SDG 8** (Decent Work & Economic Growth) - Work organization for campus shop staff.
- **Interactive Block Diagram:** Visual schematic of Student, Shop Owner, Web App, Backend Service, Database, Storage, and Printers matching Slide 10.
- **Process Flow Diagram:** Step-by-step transaction walkthrough matching Slide 11.
- **Literature Review:** 10 academic papers reviewed (Whitt 1985/1992/1999, Ibrahim & Whitt 2011/2018, Basgaran & Ibrahim 2023, Çil 2021, QKlinik 2025, DineWise 2025).
- **Time Frame & Budget:** 4-week implementation schedule and ₹700 budget breakdown.

### 2. 📱 Student Order Portal
- **Document Upload:** Drag-and-drop file uploader with auto page detection and preset demo files.
- **Print Configuration:**
  - Color mode (B&W @ ₹1.50 vs Color @ ₹5.00)
  - Duplex printing (15% discount + saves 50% physical paper sheets)
  - Custom page ranges (e.g., `1-5, 8, 11-14`)
  - Copies counter & paper quality (Standard 75 GSM vs Bond 100 GSM)
  - Binding options (Corner staple, Spiral coil, Soft thermal binding)
- **Live Dynamic Price Calculator:** Real-time itemized cost breakdown with tax & discounts.
- **Simulated Payment Gateway:** UPI QR Code (GPay / PhonePe / Paytm / BHIM) + Student Card + Pay at Counter.
- **Instant Digital Token Pass:** Unique alphanumeric token (`#SKC-2026-A...`), QR code, and 5-stage animated progress stepper.
- **Whitt Delay Prediction:** Mathematical estimated wait-time countdown.
- **Audio Chime:** Dual-tone sound alert when document is marked "Ready for Pickup".
- **Order History:** Full history log with instant pass reloading.

### 3. 🖥️ Shop Operator / Admin Dashboard
- **Live Queue Kanban & Board:** Real-time feed of print jobs with status indicators.
- **One-Click Progression:** `Start Print` ➔ `Mark Ready` ➔ `Handover & Complete`.
- **Counter Express Handover Scanner:** Type or scan student token code to verify payment and mark collected in seconds.
- **Analytics & Sustainability Metrics:**
  - Active queue depth & average turnaround time
  - Total daily revenue in ₹
  - SDG 12 physical paper sheets saved counter
  - Real-time printer device hardware monitors (HP LaserJet Enterprise & Canon imageRUNNER)

---

## 🚀 Quick Start Guide

### Option 1: Run with Python Flask Server (Recommended)
```bash
# 1. Navigate to the project directory
cd "C:\Users\Admin\.gemini\antigravity\scratch\smartprint"

# 2. Install dependencies (if not already installed)
pip install -r requirements.txt

# 3. Start the server
python app.py
```
Open your browser and navigate to: **`http://127.0.0.1:5000`**

### Option 2: Open Directly in Any Web Browser (Zero-Install / Offline)
Simply double-click **`index.html`** in File Explorer to run directly in Google Chrome, Edge, or Firefox! The application automatically falls back to client-side localStorage and simulation mode if the backend server is not running.

### Option 3: Deploy to Vercel
This repository includes a Vercel configuration and a Python serverless entry point.

1. Import the repository into Vercel.
2. Set the project root to the folder containing `vercel.json`.
3. Deploy with the default build settings.

The Flask API is available under `/api/*`, while the frontend is served as static files. Vercel's filesystem is ephemeral, so uploaded files and SQLite changes are stored in `/tmp` and can be reset when a serverless instance is recreated. For persistent production data, replace SQLite and local uploads with a hosted database and object storage.

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3, Tailwind CSS, Font Awesome, Canvas QR Engine, Web Audio API
- **Backend:** Python 3.14, Flask, Flask-CORS
- **Database:** SQLite 3 (`smartprint.db`)
- **Queue Theory:** Delay estimation models from Ward Whitt (1999) & Ibrahim & Whitt (2011)
