// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenEngine
 * @dev Manages token economics for medical data contributions and AI model improvements
 * @notice This contract handles rewards, staking, and economic incentives for the medical data ecosystem
 */
contract TokenEngine is ERC20, AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // Token supply configuration
    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10 ** 18; // 100 million tokens

    // Reward configuration
    uint256 public constant DATA_CONTRIBUTION_REWARD = 100 * 10 ** 18;
    uint256 public constant MODEL_IMPROVEMENT_REWARD = 500 * 10 ** 18;
    uint256 public constant VALIDATION_REWARD = 50 * 10 ** 18;
    uint256 public constant STAKING_REWARD_RATE = 10; // 10% APY

    // Staking configuration
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant STAKING_PERIOD = 90 days;
    uint256 public constant SLASHING_PERCENTAGE = 10;

    struct ContributionRecord {
        address contributor;
        uint256 amount;
        uint256 timestamp;
        ContributionType contributionType;
        string dataHash;
        bool rewarded;
    }

    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lockPeriod;
        uint256 rewardDebt;
        bool isActive;
    }

    struct ModelContribution {
        address contributor;
        uint256 modelVersion;
        uint256 accuracy;
        uint256 validationScore;
        uint256 timestamp;
        bool validated;
        uint256 rewardAmount;
    }

    enum ContributionType {
        DATA_UPLOAD,
        MODEL_TRAINING,
        MODEL_VALIDATION,
        CONSENSUS_PARTICIPATION
    }

    mapping(address => ContributionRecord[]) public contributions;
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public totalContributions;
    mapping(address => uint256) public totalRewardsEarned;
    mapping(uint256 => ModelContribution) public modelContributions;
    mapping(address => bool) public isValidNode;
    mapping(address => uint256) public reputationScore;

    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public nextModelContributionId;
    uint256 public inflationRate = 5;
    uint256 public lastInflationUpdate;

    event RewardDistributed(
        address indexed recipient,
        uint256 amount,
        ContributionType contributionType
    );
    event TokensStaked(
        address indexed staker,
        uint256 amount,
        uint256 lockPeriod
    );
    event TokensUnstaked(
        address indexed staker,
        uint256 amount,
        uint256 reward
    );
    event TokensSlashed(address indexed staker, uint256 amount, string reason);
    event ModelContributionRegistered(
        uint256 indexed contributionId,
        address indexed contributor,
        uint256 modelVersion
    );
    event ModelContributionValidated(
        uint256 indexed contributionId,
        uint256 validationScore
    );
    event NodeValidated(address indexed node, bool isValid);
    event ReputationUpdated(
        address indexed participant,
        uint256 oldScore,
        uint256 newScore
    );
    event InflationRateUpdated(uint256 oldRate, uint256 newRate);

    error InsufficientBalance(uint256 requested, uint256 available);
    error InvalidStakeAmount(uint256 amount, uint256 minimum);
    error StakingPeriodNotEnded(uint256 timeLeft);
    error NoActiveStake();
    error InvalidContribution();
    error AlreadyRewarded();
    error UnauthorizedValidator();
    error InvalidModelVersion();
    error ContributionNotFound();
    error InvalidReputationScore();
    error MaxSupplyExceeded();
    error InvalidAddress();

    constructor() ERC20("MedicalDataToken", "MDT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _mint(msg.sender, INITIAL_SUPPLY);
        lastInflationUpdate = block.timestamp;
    }

    function rewardContribution(
        address contributor,
        string memory dataHash,
        ContributionType contributionType
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant whenNotPaused {
        if (contributor == address(0)) revert InvalidAddress();

        uint256 rewardAmount = _calculateReward(contributionType);
        if (totalSupply() + rewardAmount > MAX_SUPPLY)
            revert MaxSupplyExceeded();

        ContributionRecord[] storage userContributions = contributions[
            contributor
        ];
        for (uint256 i = 0; i < userContributions.length; i++) {
            if (
                keccak256(abi.encodePacked(userContributions[i].dataHash)) ==
                keccak256(abi.encodePacked(dataHash))
            ) {
                revert AlreadyRewarded();
            }
        }

        contributions[contributor].push(
            ContributionRecord({
                contributor: contributor,
                amount: rewardAmount,
                timestamp: block.timestamp,
                contributionType: contributionType,
                dataHash: dataHash,
                rewarded: true
            })
        );

        totalContributions[contributor]++;
        totalRewardsEarned[contributor] += rewardAmount;
        totalRewardsDistributed += rewardAmount;

        _mint(contributor, rewardAmount);
        _updateReputationScore(contributor, true);

        emit RewardDistributed(contributor, rewardAmount, contributionType);
    }

    function stakeTokens(
        uint256 amount,
        uint256 lockPeriod
    ) external nonReentrant whenNotPaused {
        if (amount < MIN_STAKE_AMOUNT)
            revert InvalidStakeAmount(amount, MIN_STAKE_AMOUNT);
        if (balanceOf(msg.sender) < amount)
            revert InsufficientBalance(amount, balanceOf(msg.sender));
        if (lockPeriod < STAKING_PERIOD) lockPeriod = STAKING_PERIOD;

        if (stakes[msg.sender].isActive) {
            stakes[msg.sender].amount += amount;
        } else {
            stakes[msg.sender] = StakeInfo(
                amount,
                block.timestamp,
                lockPeriod,
                0,
                true
            );
        }

        totalStaked += amount;
        isValidNode[msg.sender] = true;

        _transfer(msg.sender, address(this), amount);
        emit TokensStaked(msg.sender, amount, lockPeriod);
    }

    function unstakeTokens() external nonReentrant whenNotPaused {
        StakeInfo storage stake = stakes[msg.sender];
        if (!stake.isActive) revert NoActiveStake();
        if (block.timestamp < stake.timestamp + stake.lockPeriod) {
            revert StakingPeriodNotEnded(
                stake.timestamp + stake.lockPeriod - block.timestamp
            );
        }

        uint256 stakedAmount = stake.amount;
        uint256 reward = _calculateStakingReward(msg.sender);

        stake.isActive = false;
        stake.amount = 0;
        stake.rewardDebt = 0;

        totalStaked -= stakedAmount;
        isValidNode[msg.sender] = false;

        _transfer(address(this), msg.sender, stakedAmount);

        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(msg.sender, reward);
            totalRewardsDistributed += reward;
        }

        emit TokensUnstaked(msg.sender, stakedAmount, reward);
    }

    function slashTokens(
        address maliciousNode,
        string memory reason
    ) external onlyRole(VALIDATOR_ROLE) nonReentrant whenNotPaused {
        StakeInfo storage stake = stakes[maliciousNode];
        if (!stake.isActive) revert NoActiveStake();

        uint256 slashAmount = (stake.amount * SLASHING_PERCENTAGE) / 100;
        stake.amount -= slashAmount;
        totalStaked -= slashAmount;

        isValidNode[maliciousNode] = false;
        _updateReputationScore(maliciousNode, false);
        _burn(address(this), slashAmount);

        emit TokensSlashed(maliciousNode, slashAmount, reason);
    }

    function registerModelContribution(
        address contributor,
        uint256 modelVersion,
        uint256 accuracy
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant whenNotPaused {
        if (contributor == address(0)) revert InvalidAddress();
        if (modelVersion == 0) revert InvalidModelVersion();

        uint256 contributionId = nextModelContributionId++;
        modelContributions[contributionId] = ModelContribution(
            contributor,
            modelVersion,
            accuracy,
            0,
            block.timestamp,
            false,
            0
        );
        emit ModelContributionRegistered(
            contributionId,
            contributor,
            modelVersion
        );
    }

    function validateModelContribution(
        uint256 contributionId,
        uint256 validationScore
    ) external nonReentrant whenNotPaused {
        if (!isValidNode[msg.sender]) revert UnauthorizedValidator();

        ModelContribution storage contribution = modelContributions[
            contributionId
        ];
        if (contribution.contributor == address(0))
            revert ContributionNotFound();
        if (contribution.validated) revert AlreadyRewarded();

        contribution.validationScore = validationScore;
        contribution.validated = true;

        uint256 reward = _calculateModelReward(validationScore);
        contribution.rewardAmount = reward;

        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(contribution.contributor, reward);
            totalRewardsDistributed += reward;
            totalRewardsEarned[contribution.contributor] += reward;
        }

        if (totalSupply() + VALIDATION_REWARD <= MAX_SUPPLY) {
            _mint(msg.sender, VALIDATION_REWARD);
            totalRewardsDistributed += VALIDATION_REWARD;
            totalRewardsEarned[msg.sender] += VALIDATION_REWARD;
        }

        emit ModelContributionValidated(contributionId, validationScore);
    }

    function updateInflationRate(
        uint256 newRate
    ) external onlyRole(ADMIN_ROLE) {
        if (newRate > 20) revert InvalidReputationScore();
        uint256 oldRate = inflationRate;
        inflationRate = newRate;
        lastInflationUpdate = block.timestamp;
        emit InflationRateUpdated(oldRate, newRate);
    }

    function applyInflation() external onlyRole(ADMIN_ROLE) {
        uint256 timeSinceLastUpdate = block.timestamp - lastInflationUpdate;
        if (timeSinceLastUpdate >= 365 days) {
            uint256 currentSupply = totalSupply();
            uint256 inflationAmount = (currentSupply *
                inflationRate *
                timeSinceLastUpdate) / (100 * 365 days);
            if (currentSupply + inflationAmount <= MAX_SUPPLY) {
                _mint(address(this), inflationAmount);
                lastInflationUpdate = block.timestamp;
            }
        }
    }

    function _calculateReward(
        ContributionType contributionType
    ) internal pure returns (uint256) {
        if (contributionType == ContributionType.DATA_UPLOAD)
            return DATA_CONTRIBUTION_REWARD;
        if (contributionType == ContributionType.MODEL_TRAINING)
            return MODEL_IMPROVEMENT_REWARD;
        if (contributionType == ContributionType.MODEL_VALIDATION)
            return VALIDATION_REWARD;
        if (contributionType == ContributionType.CONSENSUS_PARTICIPATION)
            return VALIDATION_REWARD / 2;
        return 0;
    }

    function _calculateStakingReward(
        address staker
    ) internal view returns (uint256) {
        StakeInfo storage stake = stakes[staker];
        if (!stake.isActive) return 0;
        uint256 stakingDuration = block.timestamp - stake.timestamp;
        return
            (stake.amount * STAKING_REWARD_RATE * stakingDuration) /
            (100 * 365 days);
    }

    function _calculateModelReward(
        uint256 validationScore
    ) internal pure returns (uint256) {
        if (validationScore >= 90) return MODEL_IMPROVEMENT_REWARD * 2;
        if (validationScore >= 80) return MODEL_IMPROVEMENT_REWARD;
        if (validationScore >= 70) return MODEL_IMPROVEMENT_REWARD / 2;
        if (validationScore >= 60) return MODEL_IMPROVEMENT_REWARD / 4;
        return 0;
    }

    function _updateReputationScore(
        address participant,
        bool positive
    ) internal {
        uint256 oldScore = reputationScore[participant];
        uint256 newScore = positive
            ? oldScore + 10
            : (oldScore >= 50 ? oldScore - 50 : 0);
        if (newScore > 1000) newScore = 1000;
        reputationScore[participant] = newScore;
        emit ReputationUpdated(participant, oldScore, newScore);
    }

    function getUserContributionCount(
        address user
    ) external view returns (uint256) {
        return contributions[user].length;
    }

    function getUserContribution(
        address user,
        uint256 index
    ) external view returns (ContributionRecord memory) {
        require(index < contributions[user].length, "Index out of bounds");
        return contributions[user][index];
    }

    function getPendingStakingReward(
        address staker
    ) external view returns (uint256) {
        return _calculateStakingReward(staker);
    }

    function getUserReputationScore(
        address user
    ) external view returns (uint256) {
        return reputationScore[user];
    }

    function isValidatorNode(address user) external view returns (bool) {
        return isValidNode[user];
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getTotalRewardsDistributed() external view returns (uint256) {
        return totalRewardsDistributed;
    }

    function getModelContribution(
        uint256 contributionId
    ) external view returns (ModelContribution memory) {
        return modelContributions[contributionId];
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid address");
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _transfer(address(this), to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
