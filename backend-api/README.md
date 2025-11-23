# MediChain Backend API

The Backend API is the core of the MediChain system, handling user authentication, medical record management, IPFS interactions, and blockchain transactions (via a mock gateway for demo purposes).

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (User data, metadata, mock ledger)
- **Storage**: IPFS (via public gateways)
- **Blockchain SDK**: Hyperledger Fabric Gateway (Mock implementation active)

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in this directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/medichain
   JWT_SECRET=your_super_secret_key_change_this
   # IPFS Configuration (Optional for public gateway)
   IPFS_PROJECT_ID=
   IPFS_PROJECT_SECRET=
   ```

3. **Start Server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`.

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Patient
- `GET /api/patient/records` - Get all records for logged-in patient
- `POST /api/patient/upload` - Upload new medical record (IPFS + Blockchain)
- `POST /api/patient/grant-access` - Grant access to a doctor
- `GET /api/patient/access-requests` - View pending requests

### Doctor
- `GET /api/doctor/patients` - View patients with granted access
- `GET /api/doctor/patient/:id/records` - View specific patient records
- `POST /api/doctor/request-access` - Request access to a patient

### Admin
- `GET /api/admin/users` - Manage users
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/activity` - Audit logs

## Mock Fabric Gateway
To ensure easy deployment and testing without a complex Hyperledger Fabric network, this backend uses a **Mock Gateway** (`src/fabric/gateway.js`).
- It simulates blockchain transactions.
- It stores "ledger" data in MongoDB.
- It mimics the Fabric SDK API, so switching to a real network later requires minimal code changes (just swapping the gateway file).
