// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AccessControlContract.sol";
import "./TokenEngine.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IAccessControlContract {
    function hasPermission(
        address,
        bytes32,
        bytes32
    ) external view returns (bool);
    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);
    function SYSTEM_ADMIN_ROLE() external view returns (bytes32);
}

contract DataRegistry {
    enum DataType {
        BLOOD_REPORT,
        MEDICAL_IMAGE,
        CLINICAL_NOTES,
        LAB_RESULTS,
        PRESCRIPTION,
        DIAGNOSTIC_REPORT,
        AI_MODEL_OUTPUT,
        FEDERATED_LEARNING_UPDATE
    }

    enum ClassificationLevel {
        PUBLIC,
        INTERNAL,
        CONFIDENTIAL,
        RESTRICTED
    }

    enum ProcessingStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED,
        ARCHIVED
    }

    struct MedicalDataRecord {
        bytes32 dataHash;
        bytes32 metadataHash;
        address owner;
        address contributor;
        DataType dataType;
        ClassificationLevel classification;
        ProcessingStatus status;
        string ipfsHash;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 expiryDate;
        bool isActive;
        uint256 version;
    }

    struct Provenance {
        address accessor;
        string reason;
        string ip;
        uint256 timestamp;
    }

    struct IntegrityCheck {
        bytes32 dataHash;
        bytes32 computedHash;
        bool isValid;
        uint256 lastChecked;
        uint256 checkCount;
        address verifier;
    }

    TokenEngine public tokenEngine;
    IAccessControlContract public accessControl;

    mapping(bytes32 => MedicalDataRecord) public dataRecords;
    mapping(bytes32 => Provenance[]) public provenanceLog;
    mapping(bytes32 => IntegrityCheck) public integrityChecks;
    mapping(address => bytes32[]) public userDataIds;
    mapping(bytes32 => mapping(address => bool)) public dataAccessGrants;
    mapping(bytes32 => mapping(address => bool)) public emergencyAccessGrants;
    // Data validation rules
    mapping(DataType => uint256) public maxFileSizes;
    mapping(DataType => uint256) public retentionPeriods;

    event DataRegistered(
        bytes32 indexed dataId,
        address indexed owner,
        address indexed source,
        DataType dataType
    );
    event DataAccessed(
        bytes32 indexed dataId,
        address indexed accessor,
        string reason
    );
    event DataShared(
        bytes32 indexed dataId,
        address indexed from,
        address indexed to,
        string role
    );
    event DataStatusUpdated(
        bytes32 indexed dataId,
        uint8 previousStatus,
        uint8 newStatus
    );
    event EmergencyAccessGranted(
        bytes32 indexed dataId,
        address indexed grantee,
        string reason
    );
    event IntegrityVerified(bytes32 indexed dataId, bool isValid);

    constructor(address _accessControl, address _tokenEngine) {
        accessControl = IAccessControlContract(_accessControl);
        tokenEngine = TokenEngine(_tokenEngine);
        _initializeValidationRules();
    }

    modifier onlyOwnerOrSource(bytes32 dataId) {
        require(
            msg.sender == dataRecords[dataId].owner ||
                msg.sender == dataRecords[dataId].contributor,
            "UnauthorizedAccess"
        );
        _;
    }

    function _initializeValidationRules() private {
        maxFileSizes[DataType.BLOOD_REPORT] = 10 * 1024 * 1024; // 10 MB
        maxFileSizes[DataType.MEDICAL_IMAGE] = 100 * 1024 * 1024; // 100 MB
        maxFileSizes[DataType.CLINICAL_NOTES] = 5 * 1024 * 1024; // 5 MB
        maxFileSizes[DataType.LAB_RESULTS] = 10 * 1024 * 1024; // 10 MB
        maxFileSizes[DataType.PRESCRIPTION] = 2 * 1024 * 1024; // 2 MB
        maxFileSizes[DataType.DIAGNOSTIC_REPORT] = 50 * 1024 * 1024; // 50 MB
        maxFileSizes[DataType.AI_MODEL_OUTPUT] = 20 * 1024 * 1024; // 20 MB
        maxFileSizes[DataType.FEDERATED_LEARNING_UPDATE] = 500 * 1024 * 1024; // 500 MB

        retentionPeriods[DataType.BLOOD_REPORT] = 365 days * 7;
        retentionPeriods[DataType.MEDICAL_IMAGE] = 365 days * 10;
        retentionPeriods[DataType.CLINICAL_NOTES] = 365 days * 7;
        retentionPeriods[DataType.LAB_RESULTS] = 365 days * 5;
        retentionPeriods[DataType.PRESCRIPTION] = 365 days * 2;
        retentionPeriods[DataType.DIAGNOSTIC_REPORT] = 365 days * 10;
        retentionPeriods[DataType.AI_MODEL_OUTPUT] = 365 days * 1;
        retentionPeriods[DataType.FEDERATED_LEARNING_UPDATE] = 365 days * 1;
    }

    function registerData(
        bytes32 dataHash,
        address owner,
        uint8 dataType,
        string memory ipfsHash,
        bool,
        uint256,
        string memory checksum,
        uint256 expiryDate
    ) public {
        require(dataHash != bytes32(0), "InvalidDataHash");
        require(dataRecords[dataHash].dataHash == 0, "DataAlreadyExists");
        require(owner != address(0), "InvalidOwner");

        dataRecords[dataHash] = MedicalDataRecord({
            dataHash: dataHash,
            metadataHash: keccak256(abi.encodePacked(ipfsHash, checksum)),
            owner: owner,
            contributor: msg.sender,
            dataType: DataType(dataType),
            classification: ClassificationLevel.CONFIDENTIAL,
            status: ProcessingStatus.PENDING,
            ipfsHash: ipfsHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            expiryDate: expiryDate,
            isActive: true,
            version: 1
        });

        userDataIds[owner].push(dataHash);

        emit DataRegistered(dataHash, owner, msg.sender, DataType(dataType));
        tokenEngine.rewardContribution(
            msg.sender,
            Strings.toHexString(uint256(dataHash), 32),
            TokenEngine.ContributionType.MODEL_VALIDATION
        );
    }

    function registerBatchData(
        bytes32[] memory dataHashes,
        address owner,
        uint8 dataType,
        string[] memory ipfsHashes,
        bool[] memory isEncrypted,
        uint256[] memory dataSizes,
        string[] memory checksums,
        uint256 expiryDate
    ) external {
        require(
            dataHashes.length == ipfsHashes.length &&
                ipfsHashes.length == isEncrypted.length &&
                isEncrypted.length == dataSizes.length &&
                dataSizes.length == checksums.length,
            "Length mismatch"
        );

        for (uint i = 0; i < dataHashes.length; i++) {
            registerData(
                dataHashes[i],
                owner,
                dataType,
                ipfsHashes[i],
                isEncrypted[i],
                dataSizes[i],
                checksums[i],
                expiryDate
            );
        }
    }

    function accessData(
        bytes32 dataId,
        string memory reason,
        string memory ip
    ) external returns (MedicalDataRecord memory) {
        require(
            msg.sender == dataRecords[dataId].owner ||
                msg.sender == dataRecords[dataId].contributor ||
                dataAccessGrants[dataId][msg.sender] ||
                emergencyAccessGrants[dataId][msg.sender],
            "ConsentNotGranted"
        );

        provenanceLog[dataId].push(
            Provenance({
                accessor: msg.sender,
                reason: reason,
                ip: ip,
                timestamp: block.timestamp
            })
        );

        emit DataAccessed(dataId, msg.sender, reason);

        return dataRecords[dataId];
    }

    function emergencyAccessData(
        bytes32 dataId,
        string memory reason,
        string memory ip
    ) external returns (MedicalDataRecord memory) {
        require(
            emergencyAccessGrants[dataId][msg.sender],
            "EmergencyAccessNotAuthorized"
        );

        provenanceLog[dataId].push(
            Provenance({
                accessor: msg.sender,
                reason: reason,
                ip: ip,
                timestamp: block.timestamp
            })
        );

        emit DataAccessed(dataId, msg.sender, reason);

        return dataRecords[dataId];
    }

    function shareData(
        bytes32 dataId,
        address to,
        string memory role
    ) external onlyOwnerOrSource(dataId) {
        dataAccessGrants[dataId][to] = true;
        emit DataShared(dataId, msg.sender, to, role);
    }

    function grantEmergencyAccess(
        bytes32 dataId,
        address to,
        string memory reason
    ) external {
        require(
            accessControl.hasRole(
                accessControl.SYSTEM_ADMIN_ROLE(),
                msg.sender
            ),
            "Not admin"
        );
        emergencyAccessGrants[dataId][to] = true;
        emit EmergencyAccessGranted(dataId, to, reason);
    }

    function updateDataStatus(
        bytes32 dataId,
        uint8 newStatus
    ) external onlyOwnerOrSource(dataId) {
        uint8 prevStatus = uint8(dataRecords[dataId].status);
        dataRecords[dataId].status = ProcessingStatus(newStatus);
        dataRecords[dataId].updatedAt = block.timestamp;
        emit DataStatusUpdated(dataId, prevStatus, newStatus);
    }

    function verifyDataIntegrity(
        bytes32 dataId,
        string memory checksum
    ) external returns (bool) {
        bytes32 computed = keccak256(
            abi.encodePacked(dataRecords[dataId].ipfsHash, checksum)
        );
        bool isValid = computed == dataRecords[dataId].metadataHash;

        integrityChecks[dataId] = IntegrityCheck({
            dataHash: dataId,
            computedHash: computed,
            isValid: isValid,
            lastChecked: block.timestamp,
            checkCount: integrityChecks[dataId].checkCount + 1,
            verifier: msg.sender
        });

        emit IntegrityVerified(dataId, isValid);
        tokenEngine.rewardContribution(
            msg.sender,
            Strings.toHexString(uint256(dataId), 32),
            TokenEngine.ContributionType.MODEL_VALIDATION
        );
        return isValid;
    }

    function hasDataAccess(
        bytes32 dataId,
        address accessor
    ) public view returns (bool) {
        return (dataRecords[dataId].owner == accessor ||
            dataRecords[dataId].contributor == accessor ||
            dataAccessGrants[dataId][accessor] ||
            emergencyAccessGrants[dataId][accessor]);
    }

    function getDataMetadata(
        bytes32 dataId
    )
        external
        view
        returns (
            bytes32,
            address,
            address,
            string memory,
            bool,
            uint256,
            ProcessingStatus
        )
    {
        MedicalDataRecord memory r = dataRecords[dataId];
        return (
            r.dataHash,
            r.owner,
            r.contributor,
            r.ipfsHash,
            true,
            1024,
            r.status
        );
    }

    function getUserDataIds(
        address user
    ) external view returns (bytes32[] memory) {
        return userDataIds[user];
    }

    function getDataProvenance(
        bytes32 dataId
    ) external view returns (Provenance[] memory) {
        return provenanceLog[dataId];
    }
}
