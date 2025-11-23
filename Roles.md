# Medical Blockchain Role-Based Architecture Design

## Executive Summary

This document defines the complete role-based access control (RBAC) architecture for the medical blockchain system with 5 distinct user roles: **Patient**, **Doctor**, **Diagnostic Center**, **Insurer**, and **Admin**. Each role has specific permissions, blockchain interactions, and encryption requirements.

---

## Role Definitions and Permissions

### 1. **Patient** 👤

**Primary Owner of Medical Data**

#### Core Capabilities

- **Data Upload & Management**
  - Upload medical records (PDF, PNG, DICOM, etc.)
  - Archive/unarchive records
  - Delete records (soft delete with audit trail)
  - Categorize records (lab reports, prescriptions, imaging, etc.)
- **Access Control Management**
  - Grant access to specific records to doctors/diagnostic centers/insurers
  - Revoke access at any time
  - Set time-limited access (e.g., 30 days)
  - View access history (who accessed what and when)
- **Record Viewing & Analysis**
  - View all their medical records
  - View complete access history
  - Download records
  - AI-powered features:
    - Extract diagnosis from uploaded images/PDFs
    - Generate summaries
    - Extract symptoms
    - Get health insights

#### Blockchain Interactions

- **Write Operations**:
  - Create medical record entries (hash + metadata)
  - Grant/revoke consent transactions
  - Update record metadata
- **Read Operations**:
  - Query own records
  - Query access logs
  - Query consent status

#### Encryption Requirements

- **Data at Rest**: All medical records encrypted with patient's symmetric key
- **Access Keys**: Patient holds master decryption key
- **Sharing**: When granting access, re-encrypt with recipient's public key
- **Audit Trail**: All access attempts logged on blockchain (encrypted)

---

### 2. **Doctor** 👨‍⚕️

**Healthcare Provider with Diagnostic & Treatment Authority**

#### Core Capabilities

- **Patient Record Access**
  - Request access to patient records via patient ID
  - View granted records
  - Add clinical notes to patient records (with patient consent)
  - Upload diagnostic reports for patients
- **Record Management**
  - Upload prescriptions
  - Upload treatment plans
  - Upload diagnostic reports
  - Add annotations to existing records
- **Patient Interaction**
  - Search patients by ID
  - View consent status
  - Request emergency access (with justification)
- **Own Profile Management**
  - Manage credentials
  - View access history
  - Manage specialization/department info

#### Blockchain Interactions

- **Write Operations**:
  - Request access (creates consent request transaction)
  - Upload new records for patients (with consent)
  - Add clinical notes (with consent)
  - Emergency access requests
- **Read Operations**:
  - Query patient records (if access granted)
  - Query consent status
  - Query own activity history

#### Encryption Requirements

- **Access Pattern**: Receives temporary decryption keys for granted records
- **Own Records**: Doctor-uploaded records encrypted with patient's key
- **Audit**: All access logged with doctor's digital signature
- **Emergency Access**: Special encryption bypass with mandatory audit trail

---

### 3. **Diagnostic Center** 🏥

**Medical Testing & Imaging Facility**

#### Core Capabilities

- **Test Result Management**
  - Upload lab results (blood tests, urine tests, etc.)
  - Upload imaging results (X-rays, MRIs, CT scans)
  - Upload pathology reports
  - Bulk upload capabilities
- **Patient Record Access**
  - Request access to patient records via patient ID
  - View previous test results (with consent)
  - View patient medical history (with consent)
- **Quality Assurance**
  - Verify data integrity
  - Re-upload corrected reports
  - Add quality control notes
- **Billing Integration**
  - Link test results to billing records
  - Generate test completion certificates

#### Blockchain Interactions

- **Write Operations**:
  - Upload test results (creates new record entry)
  - Request patient consent
  - Update test status (pending → completed)
  - Add verification signatures
- **Read Operations**:
  - Query patient records (with consent)
  - Query test history
  - Verify data integrity

#### Encryption Requirements

- **Data Upload**: Encrypt test results with patient's public key
- **Access**: Temporary decryption keys for viewing patient history
- **Integrity**: Digital signatures on all uploaded results
- **Audit**: All uploads and access logged

---

### 4. **Insurer** 💼

**Insurance Provider for Claims Processing**

#### Core Capabilities

- **Claims Processing**
  - Request access to specific medical records for claim verification
  - View treatment history
  - View diagnostic reports
  - Verify medical necessity
- **Policy Management**
  - Link policies to patient IDs
  - Track claim history
  - Generate claim reports
- **Limited Access**
  - **Cannot** upload medical records
  - **Cannot** modify patient data
  - **Can only** view with explicit patient consent
  - Time-limited access (e.g., 7 days for claim processing)
- **Audit & Compliance**
  - View access logs
  - Generate compliance reports
  - Track consent expiry

#### Blockchain Interactions

- **Write Operations**:
  - Request access (consent request)
  - Log claim processing activities
  - Update claim status
- **Read Operations**:
  - Query patient records (with consent)
  - Query claim history
  - Verify record authenticity

#### Encryption Requirements

- **Access Only**: Receives read-only decryption keys
- **Time-Limited**: Keys expire after consent period
- **Audit**: All access heavily logged and monitored
- **No Upload**: Cannot encrypt/upload new medical data

---

### 5. **Admin** 👑

**System Administrator with Oversight Authority**

#### Core Capabilities

- **Complete System Oversight**
  - View all blockchain transactions
  - Access complete audit trail
  - Monitor system health
  - View all user activities
- **User Management**
  - Create/disable user accounts
  - Manage role assignments
  - Reset passwords
  - Handle account recovery
- **Data Management**
  - Edit record metadata (names, categories, tags)
  - Archive/restore records
  - Download records for backup
  - Manage data retention policies
- **Access Control Override**
  - Grant emergency access
  - Revoke compromised access
  - Investigate access violations
  - Manage consent disputes
- **System Configuration**
  - Configure encryption policies
  - Manage blockchain nodes
  - Update smart contracts
  - Configure retention periods

#### Blockchain Interactions

- **Write Operations**:
  - Emergency access grants
  - System configuration updates
  - User role assignments
  - Audit trail annotations
- **Read Operations**:
  - Query ALL transactions (full ledger access)
  - Query ALL user activities
  - Query system metrics
  - Generate compliance reports

#### Encryption Requirements

- **Master Keys**: Holds escrow keys for emergency access
- **Audit Access**: Can decrypt audit trails
- **No Patient Data**: Cannot decrypt patient medical data without consent
- **System Keys**: Manages encryption infrastructure
- **Logging**: All admin actions heavily logged and immutable

---

## Role Interaction Matrix

| Action                    | Patient          | Doctor            | Diagnostic Center | Insurer           | Admin           |
| ------------------------- | ---------------- | ----------------- | ----------------- | ----------------- | --------------- |
| **Upload Medical Record** | ✅               | ✅ (with consent) | ✅                | ❌                | ❌              |
| **View Own Records**      | ✅               | ✅                | ✅                | ✅                | ✅              |
| **View Patient Records**  | ✅ (own)         | ✅ (with consent) | ✅ (with consent) | ✅ (with consent) | ✅ (audit only) |
| **Grant Access**          | ✅               | ❌                | ❌                | ❌                | ✅ (emergency)  |
| **Revoke Access**         | ✅               | ❌                | ❌                | ❌                | ✅ (emergency)  |
| **Request Access**        | ❌               | ✅                | ✅                | ✅                | ❌              |
| **Delete Records**        | ✅ (soft delete) | ❌                | ❌                | ❌                | ✅ (with audit) |
| **Edit Metadata**         | ✅ (own)         | ❌                | ❌                | ❌                | ✅ (all)        |
| **View Audit Trail**      | ✅ (own)         | ✅ (own)          | ✅ (own)          | ✅ (own)          | ✅ (all)        |
| **Emergency Access**      | ❌               | ✅ (request)      | ❌                | ❌                | ✅ (grant)      |
| **Manage Users**          | ❌               | ❌                | ❌                | ❌                | ✅              |
| **Download Records**      | ✅ (own)         | ✅ (with consent) | ✅ (with consent) | ✅ (with consent) | ✅ (all)        |

---

## Blockchain & Encryption Architecture

### Data Flow Example: Patient Uploads Record

```
1. Patient uploads PDF/PNG
   ↓
2. Frontend: File → IPFS (get hash)
   ↓
3. Generate symmetric key (AES-256)
   ↓
4. Encrypt file with symmetric key
   ↓
5. Encrypt symmetric key with patient's public key
   ↓
6. Create blockchain transaction:
   - Record ID
   - IPFS hash (encrypted file)
   - Encrypted symmetric key
   - Metadata (encrypted)
   - Patient signature
   ↓
7. Smart contract validates & stores
   ↓
8. Emit event: RecordCreated
```

### Data Flow Example: Doctor Requests Access

```
1. Doctor requests access via patient ID
   ↓
2. Smart contract creates consent request
   ↓
3. Patient receives notification
   ↓
4. Patient approves/denies
   ↓
5. If approved:
   - Decrypt symmetric key with patient's private key
   - Re-encrypt with doctor's public key
   - Store encrypted key on blockchain
   - Grant access in smart contract
   ↓
6. Doctor can now:
   - Retrieve encrypted file from IPFS
   - Decrypt symmetric key with their private key
   - Decrypt file with symmetric key
   ↓
7. All access logged on blockchain
```

### Data Flow Example: Admin Views Audit Trail

```
1. Admin queries blockchain for all transactions
   ↓
2. Smart contract checks admin role
   ↓
3. Returns audit trail (encrypted)
   ↓
4. Admin decrypts with audit key
   ↓
5. Views:
   - All record uploads
   - All access requests
   - All consent grants/revokes
   - All file downloads
   - All user actions
```

---

## Smart Contract Requirements

### 1. **MedicalRecordContract** (Hyperledger Fabric)

```javascript
Functions needed:
- createRecord(recordId, ipfsHash, encryptedKey, metadata, patientId)
- requestAccess(recordId, requesterId, reason)
- grantAccess(recordId, requesterId, duration)
- revokeAccess(recordId, requesterId)
- getRecord(recordId, requesterId) // checks permissions
- getAccessHistory(recordId)
- updateMetadata(recordId, newMetadata, userId)
- archiveRecord(recordId, patientId)
```

### 2. **ConsentManagementContract** (Solidity - EVM)

```solidity
Functions needed:
- grantConsent(address patient, address grantee, uint256 dataCategory, uint256 duration)
- revokeConsent(bytes32 consentId)
- hasDataAccess(address patient, address accessor, uint256 dataCategory)
- grantEmergencyAccess(address patient, string reason, uint256 duration)
- getPatientConsents(address patient)
```

### 3. **AccessControlContract** (Solidity - EVM)

```solidity
Roles needed:
- PATIENT_ROLE
- DOCTOR_ROLE
- DIAGNOSTIC_CENTER_ROLE
- INSURER_ROLE
- ADMIN_ROLE

Functions needed:
- assignRole(address user, bytes32 role)
- revokeRole(address user, bytes32 role)
- hasRole(bytes32 role, address user)
- hasPermission(address user, bytes32 resource, bytes32 action)
```

### 4. **EncryptionContract** (Hyperledger Fabric)

```javascript
Functions needed:
- storeProtectedMedicalData(recordId, encryptedData, patientId)
- retrieveProtectedMedicalData(recordId, requesterId, accessToken)
- updateMedicalRecord(recordId, updatedData, providerId)
- getPatientRecords(patientId, requesterId)
- revokeRecordAccess(recordId, patientId)
- getRecordAuditTrail(recordId, requesterId)
```

### 5. **KeyManagementContract** (Hyperledger Fabric)

```javascript
Functions needed:
- generateRSAKeyPair(userId, userType)
- generateSymmetricKey(dataOwnerId, purpose, providerId)
- rotateSymmetricKey(keyId, requesterId)
- revokeKey(keyId, requesterId, reason)
- getOwnerKeys(dataOwnerId, requesterId)
```

---

## Implementation Checklist

### Phase 1: Role Infrastructure ✅ (Partially Complete)

- [x] AccessControlContract.sol exists
- [x] ConsentManagement.sol exists
- [ ] Add all 5 roles (currently has PATIENT, EMERGENCY)
- [ ] Add DOCTOR_ROLE, DIAGNOSTIC_CENTER_ROLE, INSURER_ROLE, ADMIN_ROLE
- [ ] Implement permission matrix

### Phase 2: Encryption & Key Management ✅ (Complete)

- [x] EncryptionContract.js deployed
- [x] KeyManagementContract.js deployed
- [x] Encryption utilities in network/crypto/
- [ ] Test key rotation
- [ ] Test emergency access

### Phase 3: Data Management ⚠️ (Needs Work)

- [x] DataRegistry.sol exists
- [ ] Integrate with EncryptionContract
- [ ] Add IPFS integration
- [ ] Implement access control checks
- [ ] Add audit trail logging

### Phase 4: Frontend Integration ❌ (Not Started)

- [ ] User authentication by role
- [ ] Patient dashboard
- [ ] Doctor dashboard
- [ ] Diagnostic center dashboard
- [ ] Insurer dashboard
- [ ] Admin dashboard
- [ ] Access request workflows
- [ ] Consent management UI

### Phase 5: Backend API ❌ (Not Started)

- [ ] REST API for each role
- [ ] Fabric Gateway SDK integration
- [ ] Web3 provider for EVM contracts
- [ ] IPFS client integration
- [ ] Authentication middleware
- [ ] Authorization middleware

---

## Blockchain Maintenance Requirements

### 1. **Ledger Partitioning by Channel**

**Recommended Architecture:**

- **medical-channel**: Patient records, doctor notes, diagnostic reports
  - Participants: Hospital, Diagnostic Centers
  - Chaincode: EncryptionContract, KeyManagementContract
- **insurance-channel**: Insurance claims, policy data
  - Participants: Hospital, Insurance
  - Chaincode: ClaimsContract (to be created)
- **private-data-channel**: Sensitive patient data, audit trails
  - Participants: Hospital, Regulatory
  - Chaincode: AuditContract (to be created)

### 2. **Private Data Collections**

For each organization:

```yaml
collections:
  - name: HospitalPrivateData
    policy: "OR('HospitalMSP.member')"
    requiredPeerCount: 1
    maxPeerCount: 2

  - name: InsurancePrivateData
    policy: "OR('InsuranceMSP.member')"
    requiredPeerCount: 1
    maxPeerCount: 2
```

### 3. **Access Patterns**

**Patient Queries:**

```javascript
// Get all my records
getPatientRecords(patientId);

// Get access history
getAccessHistory(patientId);

// Get active consents
getActiveConsents(patientId);
```

**Doctor Queries:**

```javascript
// Get accessible patient records
getAccessibleRecords(doctorId);

// Get specific patient record (with consent check)
getPatientRecord(patientId, recordId, doctorId);
```

**Admin Queries:**

```javascript
// Get all transactions
getAllTransactions(startDate, endDate);

// Get user activity
getUserActivity(userId, startDate, endDate);

// Get system metrics
getSystemMetrics();
```

---

## Security & Compliance

### 1. **Encryption Layers**

- **Layer 1**: File encryption (AES-256-GCM)
- **Layer 2**: Key encryption (RSA-2048 or RSA-4096)
- **Layer 3**: Transport encryption (TLS 1.3)
- **Layer 4**: Blockchain encryption (Fabric TLS + mTLS)

### 2. **Audit Requirements**

All actions must be logged:

- Who (user ID + role)
- What (action type)
- When (timestamp)
- Where (IP address, location)
- Why (reason/purpose)
- Result (success/failure)

### 3. **Compliance**

- **HIPAA**: All patient data encrypted, access logged
- **GDPR**: Right to be forgotten (soft delete), data portability
- **SOC 2**: Audit trails, access controls, encryption

---

## Next Steps

1. **Update Smart Contracts**

   - Add all 5 roles to AccessControlContract
   - Implement permission checks in all contracts
   - Add role-specific functions

2. **Test Role Interactions**

   - Test patient upload → doctor access flow
   - Test consent management
   - Test emergency access
   - Test admin oversight

3. **Create Backend API**

   - Role-based authentication
   - Fabric Gateway integration
   - IPFS integration
   - Access control middleware

4. **Build Frontend**

   - Role-specific dashboards
   - Access request workflows
   - Consent management UI
   - Admin panel

5. **Integration Testing**
   - End-to-end workflows
   - Performance testing
   - Security testing
   - Compliance validation
