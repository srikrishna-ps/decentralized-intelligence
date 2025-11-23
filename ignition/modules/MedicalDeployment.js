const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MedicalDeployment", (m) => {
    // Get the deployer account
    const deployer = m.getAccount(0);

    // 1. Deploy ConsentManagement
    const consentManagement = m.contract("ConsentManagement", [deployer]);

    // 2. Deploy AccessControlContract
    const accessControl = m.contract("AccessControlContract", [deployer, consentManagement]);

    // 3. Deploy TokenEngine (no constructor parameters - uses INITIAL_SUPPLY constant)
    const tokenEngine = m.contract("TokenEngine");

    // 4. Deploy DataRegistry
    const dataRegistry = m.contract("DataRegistry", [accessControl, tokenEngine]);

    return { consentManagement, accessControl, tokenEngine, dataRegistry };
});
