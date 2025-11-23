# Sepolia Deployment Configuration

## 🔑 Required Information

You need to add these to your `.env` file in the project root:

### 1. Get Your MetaMask Private Key

**Steps:**
1. Open MetaMask
2. Click three dots (⋮) → Account Details
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (starts with 0x...)

### 2. Get Free Infura RPC URL

**Steps:**
1. Go to https://infura.io
2. Sign up (free, no credit card)
3. Create new project
4. Copy the Sepolia endpoint URL
5. It looks like: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

### 3. Create `.env` File in Project Root

**File:** `decentralized-medical-contracts/.env`

```env
# Sepolia Testnet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=0xyour_metamask_private_key_here
```

### 4. Deploy to Sepolia

```bash
npx hardhat ignition deploy ignition/modules/MedicalDeployment.js --network sepolia
```

**This will:**
- Deploy all 4 smart contracts to Sepolia
- Use your 0.05 ETH for gas fees
- Give you deployed contract addresses
- Contracts will be on public testnet!

---

## ⚠️ IMPORTANT

- **NEVER share your private key!**
- **NEVER commit .env to GitHub!**
- Add `.env` to `.gitignore`

---

## 🚀 After Deployment

You'll get contract addresses like:
```
ConsentManagement: 0x...
AccessControl: 0x...
TokenEngine: 0x...
DataRegistry: 0x...
```

Add these to `backend-api/.env` to connect backend to Sepolia!
