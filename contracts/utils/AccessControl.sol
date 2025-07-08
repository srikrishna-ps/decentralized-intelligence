// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MedicalAccessControl
 * @dev Base contract for medical system access control with role-based permissions
 * This contract defines the core roles and permissions for the medical system
 */
contract MedicalAccessControl is AccessControl, ReentrancyGuard, Pausable {
    // Define roles using keccak256 hash for gas optimization
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant LAB_ROLE = keccak256("LAB_ROLE");
    bytes32 public constant HOSPITAL_ROLE = keccak256("HOSPITAL_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant SYSTEM_ADMIN_ROLE = keccak256("SYSTEM_ADMIN_ROLE");

    // Events for tracking role changes and access attempts
    /*
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    */
    event AccessAttempt(
        address indexed user,
        bytes32 indexed role,
        bool success,
        uint256 timestamp
    );
    event EmergencyAccessUsed(
        address indexed user,
        address indexed patient,
        string reason,
        uint256 timestamp
    );

    // Mapping to track failed access attempts for security
    mapping(address => uint256) public failedAccessAttempts;
    mapping(address => uint256) public lastFailedAccess;

    // Security constants
    uint256 public constant MAX_FAILED_ATTEMPTS = 5;
    uint256 public constant LOCKOUT_DURATION = 1 hours;

    /**
     * @dev Constructor sets up the contract with initial admin
     * @param _admin Address of the initial system administrator
     */
    constructor(address _admin) {
        require(_admin != address(0), "Admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SYSTEM_ADMIN_ROLE, _admin);
    }

    /**
     * @dev Modifier to check if user is not locked out due to failed attempts
     */
    modifier notLockedOut() {
        require(
            !isLockedOut(msg.sender),
            "Account temporarily locked due to failed attempts"
        );
        _;
    }

    /**
     * @dev Check if an account is locked out
     * @param account Address to check
     * @return true if account is locked out
     */
    function isLockedOut(address account) public view returns (bool) {
        return
            failedAccessAttempts[account] >= MAX_FAILED_ATTEMPTS &&
            block.timestamp < lastFailedAccess[account] + LOCKOUT_DURATION;
    }

    /**
     * @dev Record a failed access attempt
     * @param account Address that failed access
     */
    function _recordFailedAccess(address account) internal {
        failedAccessAttempts[account]++;
        lastFailedAccess[account] = block.timestamp;
        emit AccessAttempt(account, bytes32(0), false, block.timestamp);
    }

    /**
     * @dev Reset failed access attempts for an account
     * @param account Address to reset
     */
    function resetFailedAttempts(
        address account
    ) external onlyRole(SYSTEM_ADMIN_ROLE) {
        failedAccessAttempts[account] = 0;
        lastFailedAccess[account] = 0;
    }

    /**
     * @dev Emergency pause function for system-wide halt
     */
    function emergencyPause() external onlyRole(SYSTEM_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the system
     */
    function unpause() external onlyRole(SYSTEM_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Override to add security checks
     */
    function hasRole(
        bytes32 role,
        address account
    ) public view override returns (bool) {
        if (isLockedOut(account)) {
            return false;
        }
        return super.hasRole(role, account);
    }
}
