# MediChain - Decentralized Medical Record System

MediChain is a secure, blockchain-based medical record management system designed to give patients control over their health data while ensuring seamless access for doctors, diagnostic centers, and insurers.

## Key Features
- **Decentralized Storage**: Medical records are stored on IPFS, ensuring data integrity and availability.
- **Blockchain Security**: Access control and audit logs are managed via Hyperledger Fabric (Mock Mode for Demo).
- **Role-Based Access**: Distinct portals for Patients, Doctors, Diagnostic Centers, Insurers, and Admins.
- **Granular Permissions**: Patients grant and revoke access to their records with time-limited permissions.
- **Audit Trail**: Every action (view, upload, grant) is logged and immutable.

## Technology Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js, MongoDB (for user data & mock ledger).
- **Blockchain**: Hyperledger Fabric (Network artifacts included, currently running in Mock Gateway mode for easy deployment).
- **Storage**: IPFS (InterPlanetary File System).

## Project Structure
- `frontend/`: Next.js web application (Patient, Doctor, Admin portals).
- `backend-api/`: Node.js Express API handling auth, IPFS, and blockchain interactions.
- `network/`: Hyperledger Fabric network configuration and scripts.
- `contracts/`: Smart contract definitions.

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/medichain.git
   cd medichain
   ```

2. **Setup Backend**
   ```bash
   cd backend-api
   npm install
   # Create .env file (see backend-api/README.md)
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   # Create .env.local file (see frontend/README.md)
   npm run dev
   ```

4. **Access the App**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## License
This project is licensed under the MIT License.
