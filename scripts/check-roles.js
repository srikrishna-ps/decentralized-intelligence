const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer, patient, doctor] = await hre.ethers.getSigners();

    console.log("Checking role assignments...");
    console.log("Patient (Account 1):", patient.address);
    console.log("Doctor (Account 2):", doctor.address);

    // Read deployed addresses
    const deployedAddressesPath = path.join(__dirname, "../ignition/deployments/chain-31337/deployed_addresses.json");
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    const accessControlAddress = deployedAddresses["MedicalDeployment#AccessControlContract"];
    const AccessControl = await hre.ethers.getContractAt("AccessControlContract", accessControlAddress);

    const PATIENT_ROLE = await AccessControl.PATIENT_ROLE();
    const DOCTOR_ROLE = await AccessControl.DOCTOR_ROLE();

    const hasPatientRole = await AccessControl.hasRole(PATIENT_ROLE, patient.address);
    const hasDoctorRole = await AccessControl.hasRole(DOCTOR_ROLE, doctor.address);

    console.log("\nRole Check Results:");
    console.log("Patient has PATIENT_ROLE:", hasPatientRole);
    console.log("Doctor has DOCTOR_ROLE:", hasDoctorRole);
}

main().catch(console.error);
