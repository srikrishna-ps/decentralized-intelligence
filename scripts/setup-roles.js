const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer, patient, doctor] = await hre.ethers.getSigners();

    console.log("Setting up roles...");
    console.log("Deployer/Admin:", deployer.address);
    console.log("Patient:", patient.address);
    console.log("Doctor:", doctor.address);

    // Read deployed addresses from ignition
    const deployedAddressesPath = path.join(__dirname, "../ignition/deployments/chain-31337/deployed_addresses.json");
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    const accessControlAddress = deployedAddresses["MedicalDeployment#AccessControlContract"];
    const consentManagementAddress = deployedAddresses["MedicalDeployment#ConsentManagement"];

    console.log("\n=== AccessControlContract Roles ===");
    console.log("AccessControl address:", accessControlAddress);

    const AccessControl = await hre.ethers.getContractAt("AccessControlContract", accessControlAddress, deployer);

    const AC_PATIENT_ROLE = await AccessControl.PATIENT_ROLE();
    const AC_DOCTOR_ROLE = await AccessControl.DOCTOR_ROLE();

    console.log("Granting PATIENT_ROLE to patient address...");
    await (await AccessControl.grantRole(AC_PATIENT_ROLE, patient.address)).wait();
    console.log("✓ PATIENT_ROLE granted on AccessControl");

    console.log("Granting DOCTOR_ROLE to doctor address...");
    await (await AccessControl.grantRole(AC_DOCTOR_ROLE, doctor.address)).wait();
    console.log("✓ DOCTOR_ROLE granted on AccessControl");

    console.log("\n=== ConsentManagement Roles ===");
    console.log("ConsentManagement address:", consentManagementAddress);

    const ConsentManagement = await hre.ethers.getContractAt("ConsentManagement", consentManagementAddress, deployer);

    const CM_PATIENT_ROLE = await ConsentManagement.PATIENT_ROLE();
    const CM_DOCTOR_ROLE = await ConsentManagement.DOCTOR_ROLE();

    console.log("Granting PATIENT_ROLE to patient address...");
    await (await ConsentManagement.grantRole(CM_PATIENT_ROLE, patient.address)).wait();
    console.log("✓ PATIENT_ROLE granted on ConsentManagement");

    console.log("Granting DOCTOR_ROLE to doctor address...");
    await (await ConsentManagement.grantRole(CM_DOCTOR_ROLE, doctor.address)).wait();
    console.log("✓ DOCTOR_ROLE granted on ConsentManagement");

    console.log("\n✅ All roles setup complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
