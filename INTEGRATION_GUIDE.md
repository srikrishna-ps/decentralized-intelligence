# Medical Website Integration Guide

## Overview
This guide explains how to integrate your Hyperledger Fabric medical network with your medical website.

## Architecture

```
Medical Website (Frontend)
    ↓ HTTP/REST
Backend API Service (Node.js/Express)
    ↓ Fabric Gateway SDK
Hyperledger Fabric Network
    ↓ Smart Contracts
Medical Data on Blockchain
```

## Step 1: Backend API Service Setup

### 1.1 Create API Service Structure

```bash
mkdir medical-api
cd medical-api
npm init -y
npm install express cors dotenv
npm install fabric-network fabric-gateway
```

### 1.2 Connection Configuration

Copy connection profile from your network:
- `network/connection-hospital.json` → `medical-api/config/connection-profile.json`
- Update paths to point to your MSP certificates

### 1.3 Create Gateway Connection Module

**File: `medical-api/src/fabric-connection.js`**

```javascript
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

class FabricConnection {
    constructor() {
        this.gateway = new Gateway();
        this.walletPath = path.join(process.cwd(), 'wallet');
    }

    async connect(userId = 'appUser') {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '../config/connection-profile.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const wallet = await Wallets.newFileSystemWallet(this.walletPath);

        // Check if user exists in wallet
        const userExists = await wallet.get(userId);
        if (!userExists) {
            throw new Error(`User ${userId} does not exist in wallet`);
        }

        // Connect to gateway
        await this.gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        });

        return this.gateway;
    }

    async getContract(channelName, contractName) {
        const network = await this.gateway.getNetwork(channelName);
        return network.getContract(contractName);
    }

    async disconnect() {
        await this.gateway.disconnect();
    }
}

module.exports = FabricConnection;
```

## Step 2: Create REST API Endpoints

### 2.1 Medical Data API

**File: `medical-api/src/routes/medical-data.js`**

```javascript
const express = require('express');
const router = express.Router();
const FabricConnection = require('../fabric-connection');

const fabric = new FabricConnection();

// Initialize connection (call once at startup)
let contract;
(async () => {
    await fabric.connect('appUser');
    contract = await fabric.getContract('medical-channel', 'data-registry');
})();

// Store medical record
router.post('/records', async (req, res) => {
    try {
        const { patientId, data, providerId } = req.body;
        
        const result = await contract.submitTransaction(
            'CreateMedicalRecord',
            patientId,
            JSON.stringify(data),
            providerId
        );
        
        res.json({
            success: true,
            txId: result.toString(),
            message: 'Medical record stored on blockchain'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get medical record
router.get('/records/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const result = await contract.evaluateTransaction(
            'GetMedicalRecord',
            patientId
        );
        
        const record = JSON.parse(result.toString());
        res.json({
            success: true,
            data: record
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Consent management
router.post('/consent', async (req, res) => {
    try {
        const { patientId, providerId, consentType, granted } = req.body;
        
        const result = await contract.submitTransaction(
            'GrantConsent',
            patientId,
            providerId,
            consentType,
            granted.toString()
        );
        
        res.json({
            success: true,
            txId: result.toString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
```

### 2.2 Main API Server

**File: `medical-api/src/app.js`**

```javascript
const express = require('express');
const cors = require('cors');
const medicalDataRoutes = require('./routes/medical-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/medical', medicalDataRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', network: 'connected' });
});

app.listen(PORT, () => {
    console.log(`Medical API Server running on port ${PORT}`);
});
```

## Step 3: Frontend Integration

### 3.1 React/Next.js Example

```javascript
// services/medical-api.js
const API_BASE = 'http://localhost:3000/api/medical';

export const medicalAPI = {
    // Store medical record
    async storeRecord(patientId, data, providerId) {
        const response = await fetch(`${API_BASE}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, data, providerId })
        });
        return response.json();
    },

    // Get medical record
    async getRecord(patientId) {
        const response = await fetch(`${API_BASE}/records/${patientId}`);
        return response.json();
    },

    // Grant consent
    async grantConsent(patientId, providerId, consentType, granted) {
        const response = await fetch(`${API_BASE}/consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, providerId, consentType, granted })
        });
        return response.json();
    }
};
```

### 3.2 Usage in React Component

```javascript
import { medicalAPI } from '../services/medical-api';

function MedicalRecordForm() {
    const handleSubmit = async (formData) => {
        try {
            const result = await medicalAPI.storeRecord(
                formData.patientId,
                formData.medicalData,
                'hospital-001'
            );
            
            if (result.success) {
                alert(`Record stored! Transaction ID: ${result.txId}`);
            }
        } catch (error) {
            console.error('Error storing record:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Your form fields */}
        </form>
    );
}
```

## Step 4: User Identity Management

### 4.1 Enroll Users

Before your website can interact with the blockchain, users need identities:

```javascript
// medical-api/src/enroll-user.js
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function enrollUser(userId, userPassword) {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '../config/connection-profile.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create wallet
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if user already exists
    const userExists = await wallet.get(userId);
    if (userExists) {
        console.log(`User ${userId} already exists in wallet`);
        return;
    }

    // Check if admin user exists (needed to register new users)
    const adminExists = await wallet.get('admin');
    if (!adminExists) {
        throw new Error('Admin user does not exist. Please enroll admin first.');
    }

    // Get CA client
    const caInfo = ccp.certificateAuthorities['ca.hospital.medical.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, {
        trustedRoots: caTLSCACerts,
        verify: false
    }, caInfo.caName);

    // Get admin identity
    const adminIdentity = await wallet.get('admin');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // Register new user
    const secret = await ca.register({
        affiliation: 'org1.department1',
        enrollmentID: userId,
        enrollmentSecret: userPassword,
        role: 'client'
    }, adminUser);

    // Enroll user
    const enrollment = await ca.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret
    });

    // Create identity
    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes()
        },
        mspId: 'HospitalMSP',
        type: 'X.509'
    };

    await wallet.put(userId, x509Identity);
    console.log(`Successfully enrolled user ${userId}`);
}

module.exports = { enrollUser };
```

## Step 5: Deployment Checklist

### 5.1 Development Environment
- [ ] Backend API service running
- [ ] Connection profile configured
- [ ] User identities enrolled in wallet
- [ ] Test API endpoints working
- [ ] Frontend can connect to API

### 5.2 Production Environment
- [ ] Fabric network deployed (cloud/on-premise)
- [ ] API service deployed with proper security
- [ ] HTTPS/TLS configured
- [ ] User authentication integrated
- [ ] Error handling and logging
- [ ] Monitoring and alerts

## Step 6: Security Considerations

1. **API Authentication**: Add JWT/OAuth to your API
2. **TLS**: Use HTTPS for all API calls
3. **Identity Management**: Secure wallet storage
4. **Access Control**: Implement role-based access in contracts
5. **Data Encryption**: Use encryption contracts for sensitive data

## Step 7: Testing

### 7.1 Unit Tests
```javascript
// Test API endpoints
describe('Medical API', () => {
    it('should store medical record', async () => {
        const result = await medicalAPI.storeRecord('patient1', {...}, 'hospital1');
        expect(result.success).toBe(true);
    });
});
```

### 7.2 Integration Tests
- Test full flow: Frontend → API → Blockchain
- Test error scenarios
- Test concurrent requests

## Estimated Integration Time

- **Backend API Setup**: 4-6 hours
- **Frontend Integration**: 2-4 hours
- **User Identity Management**: 2-3 hours
- **Testing & Debugging**: 3-5 hours
- **Security Hardening**: 4-6 hours

**Total: 15-24 hours** (2-3 days of focused work)

## Next Steps

1. Fix channel creation issue (4-8 hours)
2. Deploy contracts (1-2 hours)
3. Set up backend API (4-6 hours)
4. Integrate with frontend (2-4 hours)
5. Test end-to-end (3-5 hours)

**Grand Total: 14-25 hours** (2-3 days) to have a fully working integration

