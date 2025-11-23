const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const accessControlAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  console.log("Attempting to connect to AccessControl at:", accessControlAddress);

  try {
    const code = await hre.ethers.provider.getCode(accessControlAddress);
    console.log("Contract code length:", code.length);
    
    if (code === "0x") {
      console.log("ERROR: No contract deployed at this address!");
      return;
    }

    const AccessControl = await hre.ethers.getContractAt("AccessControlContract", accessControlAddress, deployer);
    console.log("Contract instance created successfully");

    const patientRole = await AccessControl.PATIENT_ROLE();
    console.log("PATIENT_ROLE:", patientRole);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full error:", error);
  }
}

main().catch(console.error);
