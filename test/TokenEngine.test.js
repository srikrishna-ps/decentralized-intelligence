const hre = require("hardhat");
const { expect } = require("chai");
const ethers = hre.ethers;

describe("TokenEngine", function () {
    let tokenEngine;
    let owner, addr1, addr2, addr3;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
        const TokenEngineFactory = await ethers.getContractFactory("TokenEngine");
        tokenEngine = await TokenEngineFactory.deploy(); // Already deployed
    });    

    describe("Deployment", function () {
        it("Should deploy with correct initial parameters", async function () {
            expect(await tokenEngine.name()).to.equal("MedicalDataToken");
            expect(await tokenEngine.symbol()).to.equal("MDT");
            expect(await tokenEngine.totalSupply()).to.equal(ethers.parseEther("100000000"));
            expect(await tokenEngine.balanceOf(owner.address)).to.equal(ethers.parseEther("100000000"));
        });

        it("Should set correct roles for deployer", async function () {
            const ADMIN_ROLE = await tokenEngine.ADMIN_ROLE();
            const DISTRIBUTOR_ROLE = await tokenEngine.DISTRIBUTOR_ROLE();
            const VALIDATOR_ROLE = await tokenEngine.VALIDATOR_ROLE();
            
            expect(await tokenEngine.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
            expect(await tokenEngine.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be.true;
            expect(await tokenEngine.hasRole(VALIDATOR_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Reward Distribution", function () {
        it("Should reward data contribution correctly", async function () {
            const initialBalance = await tokenEngine.balanceOf(addr1.address);
            const dataHash = "0x123456789abcdef";
            const contributionType = 0; // DATA_UPLOAD
            
            await tokenEngine.rewardContribution(addr1.address, dataHash, contributionType);
            
            const finalBalance = await tokenEngine.balanceOf(addr1.address);
            const expectedReward = ethers.parseEther("100"); // DATA_CONTRIBUTION_REWARD
            
            expect(finalBalance - (initialBalance)).to.equal(expectedReward);
            expect(await tokenEngine.totalContributions(addr1.address)).to.equal(1);
        });

        it("Should prevent duplicate rewards for same data hash", async function () {
            const dataHash = "0x123456789abcdef";
            const contributionType = 0; // DATA_UPLOAD
            
            await tokenEngine.rewardContribution(addr1.address, dataHash, contributionType);
            
            await expect(
                tokenEngine.rewardContribution(addr1.address, dataHash, contributionType)
            ).to.be.revertedWithCustomError(tokenEngine, "AlreadyRewarded");
        });

        it("Should reward model improvement correctly", async function () {
            const initialBalance = await tokenEngine.balanceOf(addr1.address);
            const dataHash = "0x123456789abcdef";
            const contributionType = 1; // MODEL_TRAINING
            
            await tokenEngine.rewardContribution(addr1.address, dataHash, contributionType);
            
            const finalBalance = await tokenEngine.balanceOf(addr1.address);
            const expectedReward = ethers.parseEther("500"); // MODEL_IMPROVEMENT_REWARD
            
            expect(finalBalance - (initialBalance)).to.equal(expectedReward);
        });
    });

    describe("Staking", function () {
        beforeEach(async function () {
            // Transfer some tokens to addr1 for staking
            await tokenEngine.transfer(addr1.address, ethers.parseEther("10000"));
        });

        it("Should allow staking minimum amount", async function () {
            const stakeAmount = ethers.parseEther("1000");
            const lockPeriod = 90 * 24 * 60 * 60; // 90 days
            
            await tokenEngine.connect(addr1).stakeTokens(stakeAmount, lockPeriod);
            
            const stakeInfo = await tokenEngine.stakes(addr1.address);
            expect(stakeInfo.amount).to.equal(stakeAmount);
            expect(stakeInfo.isActive).to.be.true;
            expect(await tokenEngine.isValidatorNode(addr1.address)).to.be.true;
        });

        it("Should reject staking below minimum", async function () {
            const stakeAmount = ethers.parseEther("500"); // Below minimum
            const lockPeriod = 90 * 24 * 60 * 60;
            
            await expect(
                tokenEngine.connect(addr1).stakeTokens(stakeAmount, lockPeriod)
            ).to.be.revertedWithCustomError(tokenEngine, "InvalidStakeAmount");
        });

        it("Should prevent unstaking before lock period", async function () {
            const stakeAmount = ethers.parseEther("1000");
            const lockPeriod = 90 * 24 * 60 * 60;
            
            await tokenEngine.connect(addr1).stakeTokens(stakeAmount, lockPeriod);
            
            await expect(
                tokenEngine.connect(addr1).unstakeTokens()
            ).to.be.revertedWithCustomError(tokenEngine, "StakingPeriodNotEnded");
        });

        it("Should allow unstaking after lock period", async function () {
            const stakeAmount = ethers.parseEther("1000");
            const lockPeriod = 90 * 24 * 60 * 60;
            
            await tokenEngine.connect(addr1).stakeTokens(stakeAmount, lockPeriod);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [lockPeriod + 1]);
            await ethers.provider.send("evm_mine");
            
            const initialBalance = await tokenEngine.balanceOf(addr1.address);
            await tokenEngine.connect(addr1).unstakeTokens();
            const finalBalance = await tokenEngine.balanceOf(addr1.address);
            
            expect(finalBalance - (initialBalance)).to.be.gte(stakeAmount);
            expect(await tokenEngine.isValidatorNode(addr1.address)).to.be.false;
        });
    });

    describe("Model Contributions", function () {
        beforeEach(async function () {
            // Transfer tokens and stake to make addr2 a validator
            await tokenEngine.transfer(addr2.address, ethers.parseEther("10000"));
            await tokenEngine.connect(addr2).stakeTokens(ethers.parseEther("1000"), 90 * 24 * 60 * 60);
        });

        it("Should register model contribution", async function () {
            const modelVersion = 1;
            const accuracy = 85;
            
            await tokenEngine.registerModelContribution(addr1.address, modelVersion, accuracy);
            
            const contribution = await tokenEngine.getModelContribution(0);
            expect(contribution.contributor).to.equal(addr1.address);
            expect(contribution.modelVersion).to.equal(modelVersion);
            expect(contribution.accuracy).to.equal(accuracy);
            expect(contribution.validated).to.be.false;
        });

        it("Should validate model contribution and distribute rewards", async function () {
            const modelVersion = 1;
            const accuracy = 85;
            const validationScore = 90;
            
            await tokenEngine.registerModelContribution(addr1.address, modelVersion, accuracy);
            
            const contributorInitialBalance = await tokenEngine.balanceOf(addr1.address);
            const validatorInitialBalance = await tokenEngine.balanceOf(addr2.address);
            
            await tokenEngine.connect(addr2).validateModelContribution(0, validationScore);
            
            const contributorFinalBalance = await tokenEngine.balanceOf(addr1.address);
            const validatorFinalBalance = await tokenEngine.balanceOf(addr2.address);
            
            // Contributor should receive model reward (1000 tokens for score >= 90)
            expect(contributorFinalBalance - (contributorInitialBalance)).to.equal(ethers.parseEther("1000"));
            
            // Validator should receive validation reward (50 tokens)
            expect(validatorFinalBalance - (validatorInitialBalance)).to.equal(ethers.parseEther("50"));
        });

        it("Should prevent non-validators from validating", async function () {
            const modelVersion = 1;
            const accuracy = 85;
            
            await tokenEngine.registerModelContribution(addr1.address, modelVersion, accuracy);
            
            await expect(
                tokenEngine.connect(addr3).validateModelContribution(0, 90)
            ).to.be.revertedWithCustomError(tokenEngine, "UnauthorizedValidator");
        });
    });

    describe("Slashing", function () {
        beforeEach(async function () {
            // Transfer tokens and stake
            await tokenEngine.transfer(addr1.address, ethers.parseEther("10000"));
            await tokenEngine.connect(addr1).stakeTokens(ethers.parseEther("1000"), 90 * 24 * 60 * 60);
            await tokenEngine.rewardContribution(addr1.address, "0xabc", 0); // DATA_UPLOAD
        });

        it("Should slash tokens for malicious behavior", async function () {
            const initialStake = ethers.parseEther("1000");
            const expectedSlash = (initialStake * 10n) / 100n;
            
            await tokenEngine.slashTokens(addr1.address, "Malicious behavior detected");
            
            const stakeInfo = await tokenEngine.stakes(addr1.address);
            expect(stakeInfo.amount).to.equal(initialStake - (expectedSlash));
            expect(await tokenEngine.isValidatorNode(addr1.address)).to.be.false;
        });

        it("Should update reputation score negatively after slashing", async function () {
            const initialScore = await tokenEngine.getUserReputationScore(addr1.address);
            
            await tokenEngine.slashTokens(addr1.address, "Malicious behavior");
            
            const finalScore = await tokenEngine.getUserReputationScore(addr1.address);
            expect(finalScore).to.be.lt(initialScore);
        });
    });

    describe("Reputation System", function () {
        it("Should increase reputation score for contributions", async function () {
            const initialScore = await tokenEngine.getUserReputationScore(addr1.address);
            
            await tokenEngine.rewardContribution(addr1.address, "0x123", 0);
            
            const finalScore = await tokenEngine.getUserReputationScore(addr1.address);
            expect(finalScore).to.equal(initialScore + 10n); // Ethers v6 uses BigInt
        });

        it("Should cap reputation score at 1000", async function () {
            // Simulate many contributions to reach cap
            for (let i = 0; i < 101; i++) {
                await tokenEngine.rewardContribution(addr1.address, `0x${i}`, 0);
            }
            
            const finalScore = await tokenEngine.getUserReputationScore(addr1.address);
            expect(finalScore).to.equal(1000);
        });
    });

    describe("Access Control", function () {
        it("Should allow admin to pause contract", async function () {
            await tokenEngine.pause();
            expect(await tokenEngine.paused()).to.be.true;
            
            await expect(
                tokenEngine.rewardContribution(addr1.address, "0x123", 0)
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should allow admin to unpause contract", async function () {
            await tokenEngine.pause();
            await tokenEngine.unpause();
            expect(await tokenEngine.paused()).to.be.false;
        });

        it("Should prevent non-admin from pausing", async function () {
            await expect(
                tokenEngine.connect(addr1).pause()
            ).to.be.reverted;
        });

        it("Should allow admin to update inflation rate", async function () {
            const newRate = 8;
            await tokenEngine.updateInflationRate(newRate);
            expect(await tokenEngine.inflationRate()).to.equal(newRate);
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow emergency withdrawal by admin", async function () {
            // First, get some tokens in the contract via staking
            await tokenEngine.transfer(addr1.address, ethers.parseEther("10000"));
            await tokenEngine.connect(addr1).stakeTokens(ethers.parseEther("1000"), 90 * 24 * 60 * 60);
            
            const contractBalance = await tokenEngine.balanceOf(tokenEngine.target);
            expect(contractBalance).to.be.gt(0);
            
            const adminBalanceBefore = await tokenEngine.balanceOf(owner.address);
            await tokenEngine.emergencyWithdraw(owner.address, contractBalance);
            const adminBalanceAfter = await tokenEngine.balanceOf(owner.address);
            
            expect(adminBalanceAfter - (adminBalanceBefore)).to.equal(contractBalance);
        });

        it("Should prevent non-admin from emergency withdrawal", async function () {
            await expect(
                tokenEngine.connect(addr1).emergencyWithdraw(addr1.address, 1000)
            ).to.be.reverted;
        });
    });

    describe("View Functions", function () {
        it("Should return correct user contribution count", async function () {
            await tokenEngine.rewardContribution(addr1.address, "0x123", 0);
            await tokenEngine.rewardContribution(addr1.address, "0x456", 1);
            
            expect(await tokenEngine.getUserContributionCount(addr1.address)).to.equal(2);
        });

        it("Should return correct pending staking reward", async function () {
            await tokenEngine.transfer(addr1.address, ethers.parseEther("10000"));
            await tokenEngine.connect(addr1).stakeTokens(ethers.parseEther("1000"), 90 * 24 * 60 * 60);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // 1 year
            await ethers.provider.send("evm_mine");
            
            const pendingReward = await tokenEngine.getPendingStakingReward(addr1.address);
            expect(pendingReward).to.be.gt(0);
        });

        it("Should return total staked amount", async function () {
            await tokenEngine.transfer(addr1.address, ethers.parseEther("10000"));
            await tokenEngine.transfer(addr2.address, ethers.parseEther("10000"));
            
            await tokenEngine.connect(addr1).stakeTokens(ethers.parseEther("1000"), 90 * 24 * 60 * 60);
            await tokenEngine.connect(addr2).stakeTokens(ethers.parseEther("2000"), 90 * 24 * 60 * 60);
            
            expect(await tokenEngine.getTotalStaked()).to.equal(ethers.parseEther("3000"));
        });
    });
});