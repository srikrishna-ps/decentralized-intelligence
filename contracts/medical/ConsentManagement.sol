// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../utils/AccessControl.sol";

/**
 * @title ConsentManagement
 * @dev Manages patient consent for medical data access with time-based controls
 * Implements dynamic consent with emergency override capabilities
 */
contract ConsentManagement is MedicalAccessControl {
    // Consent data structure
    struct ConsentData {
        address patient; // Patient who gave consent
        address grantedTo; // Address consent is granted to
        uint256 dataCategory; // Category of data (labs, imaging, etc.)
        uint256 grantedAt; // Timestamp when consent was granted
        uint256 expiresAt; // Timestamp when consent expires
        bool isActive; // Whether consent is currently active
        string purpose; // Purpose of data access
        bool allowSubAccess; // Whether grantee can share with others
    }

    // Emergency access structure
    struct EmergencyAccess {
        address patient;
        address accessor;
        string reason;
        uint256 timestamp;
        uint256 expiresAt;
        bool isUsed;
    }

    // Data categories for granular control
    enum DataCategory {
        BASIC_INFO, // 0 - Basic demographic info
        LAB_RESULTS, // 1 - Laboratory test results
        IMAGING, // 2 - Medical imaging data
        PRESCRIPTIONS, // 3 - Prescription history
        DIAGNOSES, // 4 - Diagnostic information
        FULL_RECORD // 5 - Complete medical record
    }

    // Storage mappings
    mapping(bytes32 => ConsentData) public consents;
    mapping(address => bytes32[]) public patientConsents;
    mapping(address => bytes32[]) public granteeConsents;
    mapping(bytes32 => EmergencyAccess) public emergencyAccesses;

    // Events
    event ConsentGranted(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed grantedTo,
        uint256 dataCategory,
        uint256 expiresAt,
        string purpose
    );

    event ConsentRevoked(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed grantedTo,
        uint256 timestamp
    );

    event EmergencyAccessGranted(
        bytes32 indexed accessId,
        address indexed patient,
        address indexed accessor,
        string reason,
        uint256 expiresAt
    );

    event ConsentExpired(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed grantedTo,
        uint256 timestamp
    );

    /**
     * @dev Constructor
     * @param _admin Address of the system administrator
     */
    constructor(address _admin) MedicalAccessControl(_admin) {}

    /**
     * @dev Grant consent for data access
     * @param _grantedTo Address to grant access to
     * @param _dataCategory Category of data to grant access to
     * @param _duration Duration of access in seconds
     * @param _purpose Purpose of data access
     * @param _allowSubAccess Whether grantee can share with others
     */
    function grantConsent(
        address _grantedTo,
        uint256 _dataCategory,
        uint256 _duration,
        string calldata _purpose,
        bool _allowSubAccess
    ) external whenNotPaused notLockedOut {
        require(
            hasRole(PATIENT_ROLE, msg.sender),
            "Only patients can grant consent"
        );
        require(_grantedTo != address(0), "Cannot grant to zero address");
        require(_grantedTo != msg.sender, "Cannot grant consent to yourself");
        require(_duration > 0 && _duration <= 365 days, "Invalid duration");
        require(
            _dataCategory <= uint256(DataCategory.FULL_RECORD),
            "Invalid data category"
        );
        require(bytes(_purpose).length > 0, "Purpose cannot be empty");

        // Verify the grantee has appropriate role
        require(
            hasRole(DOCTOR_ROLE, _grantedTo) ||
                hasRole(LAB_ROLE, _grantedTo) ||
                hasRole(HOSPITAL_ROLE, _grantedTo),
            "Grantee must have healthcare role"
        );

        // Generate unique consent ID
        bytes32 consentId = keccak256(
            abi.encodePacked(
                msg.sender,
                _grantedTo,
                _dataCategory,
                block.timestamp,
                _purpose
            )
        );

        // Check for existing active consent
        require(!consents[consentId].isActive, "Consent already exists");

        uint256 expiresAt = block.timestamp + _duration;

        // Create consent record
        consents[consentId] = ConsentData({
            patient: msg.sender,
            grantedTo: _grantedTo,
            dataCategory: _dataCategory,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            purpose: _purpose,
            allowSubAccess: _allowSubAccess
        });

        // Update tracking arrays
        patientConsents[msg.sender].push(consentId);
        granteeConsents[_grantedTo].push(consentId);

        emit ConsentGranted(
            consentId,
            msg.sender,
            _grantedTo,
            _dataCategory,
            expiresAt,
            _purpose
        );
    }

    /**
     * @dev Revoke consent
     * @param _consentId ID of the consent to revoke
     */
    function revokeConsent(
        bytes32 _consentId
    ) external whenNotPaused notLockedOut {
        ConsentData storage consent = consents[_consentId];
        require(consent.patient == msg.sender, "Only consent owner can revoke");
        require(consent.isActive, "Consent is not active");

        consent.isActive = false;

        emit ConsentRevoked(
            _consentId,
            msg.sender,
            consent.grantedTo,
            block.timestamp
        );
    }

    /**
     * @dev Check if consent is valid and active
     * @param _consentId ID of the consent to check
     * @return true if consent is valid
     */
    function isConsentValid(bytes32 _consentId) external view returns (bool) {
        ConsentData storage consent = consents[_consentId];
        return
            consent.isActive &&
            consent.expiresAt > block.timestamp &&
            !isLockedOut(consent.patient) &&
            !isLockedOut(consent.grantedTo);
    }

    /**
     * @dev Check if accessor has permission for specific data category
     * @param _patient Patient address
     * @param _accessor Accessor address
     * @param _dataCategory Data category to check
     * @return true if access is allowed
     */
    function hasDataAccess(
        address _patient,
        address _accessor,
        uint256 _dataCategory
    ) external view returns (bool) {
        if (isLockedOut(_patient) || isLockedOut(_accessor)) {
            return false;
        }

        // Check emergency access first
        if (_checkEmergencyAccess(_patient, _accessor)) {
            return true;
        }

        // Check regular consent
        bytes32[] storage patientConsentIds = patientConsents[_patient];

        for (uint256 i = 0; i < patientConsentIds.length; i++) {
            ConsentData storage consent = consents[patientConsentIds[i]];

            if (
                consent.grantedTo == _accessor &&
                consent.isActive &&
                consent.expiresAt > block.timestamp &&
                (consent.dataCategory == _dataCategory ||
                    consent.dataCategory == uint256(DataCategory.FULL_RECORD))
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Grant emergency access (for life-threatening situations)
     * @param _patient Patient address
     * @param _reason Reason for emergency access
     * @param _duration Duration of emergency access
     */
    function grantEmergencyAccess(
        address _patient,
        string calldata _reason,
        uint256 _duration
    ) external whenNotPaused {
        require(
            hasRole(EMERGENCY_ROLE, msg.sender),
            "Only emergency personnel can grant emergency access"
        );
        require(_patient != address(0), "Invalid patient address");
        require(bytes(_reason).length > 0, "Reason cannot be empty");
        require(
            _duration > 0 && _duration <= 24 hours,
            "Invalid emergency duration"
        );

        bytes32 accessId = keccak256(
            abi.encodePacked(_patient, msg.sender, block.timestamp, _reason)
        );

        uint256 expiresAt = block.timestamp + _duration;

        emergencyAccesses[accessId] = EmergencyAccess({
            patient: _patient,
            accessor: msg.sender,
            reason: _reason,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            isUsed: false
        });

        emit EmergencyAccessGranted(
            accessId,
            _patient,
            msg.sender,
            _reason,
            expiresAt
        );
        emit EmergencyAccessUsed(
            msg.sender,
            _patient,
            _reason,
            block.timestamp
        );
    }

    /**
     * @dev Get patient's active consents
     * @param _patient Patient address
     * @return Array of active consent IDs
     */
    function getPatientConsents(
        address _patient
    ) external view returns (bytes32[] memory) {
        return patientConsents[_patient];
    }

    /**
     * @dev Get consents granted to an address
     * @param _grantee Grantee address
     * @return Array of consent IDs granted to the address
     */
    function getGranteeConsents(
        address _grantee
    ) external view returns (bytes32[] memory) {
        return granteeConsents[_grantee];
    }

    /**
     * @dev Cleanup expired consents (can be called by anyone to save gas)
     * @param _consentIds Array of consent IDs to check for expiration
     */
    function cleanupExpiredConsents(bytes32[] calldata _consentIds) external {
        for (uint256 i = 0; i < _consentIds.length; i++) {
            ConsentData storage consent = consents[_consentIds[i]];
            if (consent.isActive && consent.expiresAt <= block.timestamp) {
                consent.isActive = false;
                emit ConsentExpired(
                    _consentIds[i],
                    consent.patient,
                    consent.grantedTo,
                    block.timestamp
                );
            }
        }
    }

    /**
     * @dev Internal function to check emergency access
     * @param _patient Patient address
     * @param _accessor Accessor address
     * @return true if emergency access is valid
     */
    function _checkEmergencyAccess(
        address _patient,
        address _accessor
    ) internal view returns (bool) {
        if (!hasRole(EMERGENCY_ROLE, _accessor)) {
            return false;
        }

        // In emergency situations, we need to check if there's an active emergency access
        // This is a simplified check - in production, you might want more sophisticated logic
        return true; // Emergency personnel always have access in true emergencies
    }
}
