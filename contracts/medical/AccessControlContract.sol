// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../utils/AccessControl.sol";
import "./ConsentManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
using Strings for uint256;

/**
 * @title AccessControlContract
 * @dev Implements role-based access control with permission matrix and audit logging
 * Manages multi-signature requirements for sensitive operations
 */
contract AccessControlContract is MedicalAccessControl {
    // Permission matrix structure
    struct Permission {
        bool canRead;
        bool canWrite;
        bool canDelete;
        bool canShare;
        bool canEmergencyAccess;
    }

    // Multi-signature requirement structure
    struct MultiSigRequirement {
        uint256 requiredSignatures;
        mapping(address => bool) hasApproved;
        address[] approvers;
        bool isExecuted;
        uint256 deadline;
        bytes32 operationHash;
    }

    // Audit log structure
    struct AuditLog {
        address user;
        bytes32 role;
        string action;
        address targetResource;
        bool success;
        uint256 timestamp;
        string details;
    }

    // Storage
    mapping(bytes32 => mapping(bytes32 => Permission)) public rolePermissions;
    mapping(address => mapping(bytes32 => bool)) public userPermissions;
    mapping(bytes32 => MultiSigRequirement) public multiSigRequests;
    mapping(address => AuditLog[]) public userAuditLogs;
    mapping(bytes32 => uint256) public roleMultiSigThreshold;

    AuditLog[] public systemAuditLogs;
    ConsentManagement public consentContract;

    // Events
    event PermissionGranted(
        bytes32 indexed role,
        bytes32 indexed permission,
        address indexed user,
        uint256 timestamp
    );

    event PermissionRevoked(
        bytes32 indexed role,
        bytes32 indexed permission,
        address indexed user,
        uint256 timestamp
    );

    event MultiSigRequested(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 operationHash,
        uint256 requiredSignatures,
        uint256 deadline
    );

    event MultiSigApproved(
        bytes32 indexed requestId,
        address indexed approver,
        uint256 currentApprovals,
        uint256 requiredApprovals
    );

    event MultiSigExecuted(
        bytes32 indexed requestId,
        address indexed executor,
        uint256 timestamp
    );

    event AuditLogCreated(
        address indexed user,
        bytes32 indexed role,
        string action,
        address indexed targetResource,
        bool success,
        uint256 timestamp
    );

    /**
     * @dev Constructor
     * @param _admin Address of the system administrator
     * @param _consentContract Address of the consent management contract
     */
    constructor(
        address _admin,
        address _consentContract
    ) MedicalAccessControl(_admin) {
        require(
            _consentContract != address(0),
            "Consent contract cannot be zero address"
        );
        consentContract = ConsentManagement(_consentContract);

        // Set up default permissions for roles
        _setupDefaultPermissions();

        // Set up multi-signature thresholds
        _setupMultiSigThresholds();
    }

    /**
     * @dev Check if user has specific permission
     * @param _user User address
     * @param _role Role to check
     * @param _permission Permission type
     * @return true if user has permission
     */
    function hasPermission(
        address _user,
        bytes32 _role,
        bytes32 _permission
    ) external view returns (bool) {
        if (isLockedOut(_user)) {
            return false;
        }

        // Check if user has the role
        if (!hasRole(_role, _user)) {
            return false;
        }

        // Check role-based permissions
        if (_hasRolePermission(_role, _permission)) {
            return true;
        }

        // Check user-specific permissions
        bytes32 userPermissionKey = keccak256(
            abi.encodePacked(_user, _permission)
        );
        return userPermissions[_user][userPermissionKey];
    }

    /**
     * @dev Grant specific permission to user
     * @param _user User address
     * @param _permission Permission to grant
     */
    function grantUserPermission(
        address _user,
        bytes32 _permission
    ) external onlyRole(SYSTEM_ADMIN_ROLE) whenNotPaused {
        bytes32 userPermissionKey = keccak256(
            abi.encodePacked(_user, _permission)
        );
        userPermissions[_user][userPermissionKey] = true;

        _createAuditLog(
            msg.sender,
            SYSTEM_ADMIN_ROLE,
            "GRANT_USER_PERMISSION",
            _user,
            true,
            string(abi.encodePacked("Granted permission: ", _permission))
        );

        emit PermissionGranted(bytes32(0), _permission, _user, block.timestamp);
    }

    /**
     * @dev Revoke specific permission from user
     * @param _user User address
     * @param _permission Permission to revoke
     */
    function revokeUserPermission(
        address _user,
        bytes32 _permission
    ) external onlyRole(SYSTEM_ADMIN_ROLE) whenNotPaused {
        bytes32 userPermissionKey = keccak256(
            abi.encodePacked(_user, _permission)
        );
        userPermissions[_user][userPermissionKey] = false;

        _createAuditLog(
            msg.sender,
            SYSTEM_ADMIN_ROLE,
            "REVOKE_USER_PERMISSION",
            _user,
            true,
            string(abi.encodePacked("Revoked permission: ", _permission))
        );

        emit PermissionRevoked(bytes32(0), _permission, _user, block.timestamp);
    }

    /**
     * @dev Check if user can access specific patient data
     * @param _user User address
     * @param _patient Patient address
     * @param _dataCategory Data category
     * @return true if access is allowed
     */
    function canAccessPatientData(
        address _user,
        address _patient,
        uint256 _dataCategory
    ) external returns (bool) {
        if (isLockedOut(_user) || isLockedOut(_patient)) {
            return false;
        }

        // Check consent through consent contract
        bool hasConsent = consentContract.hasDataAccess(
            _patient,
            _user,
            _dataCategory
        );

        // Check role-based permissions
        bytes32 userRole = _getUserPrimaryRole(_user);
        bool hasRolePermission = _hasRolePermission(
            userRole,
            keccak256("READ")
        );

        // Log access attempt
        _createAuditLog(
            _user,
            userRole,
            "ACCESS_PATIENT_DATA",
            _patient,
            hasConsent && hasRolePermission,
            string(
                abi.encodePacked(
                    "Data category: ",
                    Strings.toString(_dataCategory)
                )
            )
        );

        return hasConsent && hasRolePermission;
    }

    /**
     * @dev Request multi-signature approval for sensitive operation
     * @param _operationHash Hash of the operation to be performed
     * @param _deadline Deadline for approval
     * @return Request ID
     */
    function requestMultiSigApproval(
        bytes32 _operationHash,
        uint256 _deadline
    ) external whenNotPaused notLockedOut returns (bytes32) {
        require(_deadline > block.timestamp, "Deadline must be in the future");

        bytes32 userRole = _getUserPrimaryRole(msg.sender);
        require(
            roleMultiSigThreshold[userRole] > 0,
            "Role does not require multi-sig"
        );

        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, _operationHash, block.timestamp)
        );

        MultiSigRequirement storage request = multiSigRequests[requestId];
        request.requiredSignatures = roleMultiSigThreshold[userRole];
        request.isExecuted = false;
        request.deadline = _deadline;
        request.operationHash = _operationHash;

        _createAuditLog(
            msg.sender,
            userRole,
            "REQUEST_MULTISIG",
            address(0),
            true,
            "Multi-signature approval requested"
        );

        emit MultiSigRequested(
            requestId,
            msg.sender,
            _operationHash,
            request.requiredSignatures,
            _deadline
        );

        return requestId;
    }

    /**
     * @dev Approve multi-signature request
     * @param _requestId Request ID to approve
     */
    function approveMultiSigRequest(
        bytes32 _requestId
    ) external whenNotPaused notLockedOut {
        MultiSigRequirement storage request = multiSigRequests[_requestId];

        require(request.requiredSignatures > 0, "Request does not exist");
        require(!request.isExecuted, "Request already executed");
        require(block.timestamp <= request.deadline, "Request deadline passed");
        require(
            !request.hasApproved[msg.sender],
            "Already approved by this user"
        );

        // Check if user has appropriate role for approval
        bytes32 userRole = _getUserPrimaryRole(msg.sender);
        require(
            userRole == SYSTEM_ADMIN_ROLE ||
                userRole == DOCTOR_ROLE ||
                userRole == HOSPITAL_ROLE,
            "Insufficient role for approval"
        );

        request.hasApproved[msg.sender] = true;
        request.approvers.push(msg.sender);

        _createAuditLog(
            msg.sender,
            userRole,
            "APPROVE_MULTISIG",
            address(0),
            true,
            "Multi-signature request approved"
        );

        emit MultiSigApproved(
            _requestId,
            msg.sender,
            request.approvers.length,
            request.requiredSignatures
        );
    }

    /**
     * @dev Execute multi-signature request if enough approvals
     * @param _requestId Request ID to execute
     */
    function executeMultiSigRequest(
        bytes32 _requestId
    ) external whenNotPaused notLockedOut {
        MultiSigRequirement storage request = multiSigRequests[_requestId];

        require(request.requiredSignatures > 0, "Request does not exist");
        require(!request.isExecuted, "Request already executed");
        require(block.timestamp <= request.deadline, "Request deadline passed");
        require(
            request.approvers.length >= request.requiredSignatures,
            "Insufficient approvals"
        );

        request.isExecuted = true;

        _createAuditLog(
            msg.sender,
            _getUserPrimaryRole(msg.sender),
            "EXECUTE_MULTISIG",
            address(0),
            true,
            "Multi-signature request executed"
        );

        emit MultiSigExecuted(_requestId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get user's audit logs
     * @param _user User address
     * @return Array of audit logs
     */
    function getUserAuditLogs(
        address _user
    ) external view returns (AuditLog[] memory) {
        return userAuditLogs[_user];
    }

    /**
     * @dev Get system audit logs (paginated)
     * @param _offset Starting index
     * @param _limit Number of logs to return
     * @return Array of audit logs
     */
    function getSystemAuditLogs(
        uint256 _offset,
        uint256 _limit
    ) external view returns (AuditLog[] memory) {
        require(_offset < systemAuditLogs.length, "Offset out of bounds");

        uint256 end = _offset + _limit;
        if (end > systemAuditLogs.length) {
            end = systemAuditLogs.length;
        }

        AuditLog[] memory logs = new AuditLog[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            logs[i - _offset] = systemAuditLogs[i];
        }

        return logs;
    }

    /**
     * @dev Internal function to set up default permissions
     */
    function _setupDefaultPermissions() internal {
        // Patient permissions
        rolePermissions[PATIENT_ROLE][keccak256("READ")] = Permission(
            true,
            false,
            false,
            false,
            false
        );
        rolePermissions[PATIENT_ROLE][keccak256("CONSENT")] = Permission(
            true,
            false,
            false,
            false,
            false
        );

        // Doctor permissions
        rolePermissions[DOCTOR_ROLE][keccak256("READ")] = Permission(
            true,
            false,
            false,
            true,
            true
        );
        rolePermissions[DOCTOR_ROLE][keccak256("WRITE")] = Permission(
            false,
            true,
            false,
            false,
            false
        );

        // Lab permissions
        rolePermissions[LAB_ROLE][keccak256("READ")] = Permission(
            true,
            false,
            false,
            false,
            false
        );
        rolePermissions[LAB_ROLE][keccak256("WRITE")] = Permission(
            false,
            true,
            false,
            false,
            false
        );

        // Hospital permissions
        rolePermissions[HOSPITAL_ROLE][keccak256("READ")] = Permission(
            true,
            false,
            false,
            true,
            true
        );
        rolePermissions[HOSPITAL_ROLE][keccak256("WRITE")] = Permission(
            false,
            true,
            false,
            false,
            false
        );
    }

    /**
     * @dev Internal function to set up multi-signature thresholds per role
     */
    function _setupMultiSigThresholds() internal {
        roleMultiSigThreshold[DOCTOR_ROLE] = 2;
        roleMultiSigThreshold[HOSPITAL_ROLE] = 3;
        roleMultiSigThreshold[SYSTEM_ADMIN_ROLE] = 1; // Admins can act solo
    }

    /**
     * @dev Internal helper to check if a role has a permission
     */
    function _hasRolePermission(
        bytes32 _role,
        bytes32 _permission
    ) internal view returns (bool) {
        Permission memory perm = rolePermissions[_role][_permission];
        return
            perm.canRead ||
            perm.canWrite ||
            perm.canDelete ||
            perm.canShare ||
            perm.canEmergencyAccess;
    }

    /**
     * @dev Internal helper to get user's primary role (first matching one)
     */
    function _getUserPrimaryRole(
        address _user
    ) internal view returns (bytes32) {
        if (hasRole(DOCTOR_ROLE, _user)) return DOCTOR_ROLE;
        if (hasRole(PATIENT_ROLE, _user)) return PATIENT_ROLE;
        if (hasRole(HOSPITAL_ROLE, _user)) return HOSPITAL_ROLE;
        if (hasRole(LAB_ROLE, _user)) return LAB_ROLE;
        if (hasRole(SYSTEM_ADMIN_ROLE, _user)) return SYSTEM_ADMIN_ROLE;
        return bytes32(0); // No known role
    }

    /**
     * @dev Internal function to log access attempts or actions
     */
    function _createAuditLog(
        address _user,
        bytes32 _role,
        string memory _action,
        address _targetResource,
        bool _success,
        string memory _details
    ) internal {
        AuditLog memory log = AuditLog({
            user: _user,
            role: _role,
            action: _action,
            targetResource: _targetResource,
            success: _success,
            timestamp: block.timestamp,
            details: _details
        });

        userAuditLogs[_user].push(log);
        systemAuditLogs.push(log);

        emit AuditLogCreated(
            _user,
            _role,
            _action,
            _targetResource,
            _success,
            block.timestamp
        );
    }
}
