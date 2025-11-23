async function main() {
    const address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const AccessControl = await ethers.getContractAt("AccessControlContract", address);
    const patientRole = await AccessControl.PATIENT_ROLE();
    console.log("PATIENT_ROLE", patientRole);
    const doctorRole = await AccessControl.DOCTOR_ROLE();
    console.log("DOCTOR_ROLE", doctorRole);
}

main().catch(console.error);
