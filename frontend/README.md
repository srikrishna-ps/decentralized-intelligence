# MediChain Frontend

The Frontend is a modern, responsive web application built with Next.js 14, providing distinct portals for Patients, Doctors, Diagnostic Centers, Insurers, and Admins.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Auth**: NextAuth.js

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in this directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_super_secret_key_change_this
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure
- `app/`: App Router pages
  - `(auth)/`: Login/Register pages
  - `patient/`: Patient portal (Records, Access Control)
  - `doctor/`: Doctor portal (My Patients, Upload Notes)
  - `diagnostic/`: Diagnostic portal (Upload Results)
  - `insurer/`: Insurer portal (Claims, View Records)
  - `admin/`: Admin dashboard (Users, Stats, Logs)
- `components/`: Reusable UI components
  - `sidebars/`: Role-specific sidebars
  - `ui/`: Generic UI elements (Cards, Buttons, Inputs)

## Features
- Role-Based Dashboards: Automatically redirects users to their specific dashboard upon login.
- Secure File Access: Downloads files from IPFS via the backend.
- Real-Time Updates: Reflects status changes (e.g., Access Granted) immediately.
