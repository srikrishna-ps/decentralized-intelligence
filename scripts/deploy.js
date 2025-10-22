const hre = require("hardhat");

async function main() {
  // Deploy DataRegistry
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.deployed();
  console.log("DataRegistry deployed to:", dataRegistry.address);

  // Deploy TokenEngine
  const TokenEngine = await hre.ethers.getContractFactory("TokenEngine");
  const tokenEngine = await TokenEngine.deploy();
  await tokenEngine.deployed();
  console.log("TokenEngine deployed to:", tokenEngine.address);

  // Deploy ConsentManagement
  const ConsentManagement = await hre.ethers.getContractFactory("ConsentManagement");
  const consentManagement = await ConsentManagement.deploy();
  await consentManagement.deployed();
  console.log("ConsentManagement deployed to:", consentManagement.address);

  // Deploy AccessControlContract
  const AccessControlContract = await hre.ethers.getContractFactory("AccessControlContract");
  const accessControl = await AccessControlContract.deploy();
  await accessControl.deployed();
  console.log("AccessControlContract deployed to:", accessControl.address);

  // Save deployment addresses
  const fs = require("fs");
  const deployments = {
    DataRegistry: dataRegistry.address,
    TokenEngine: tokenEngine.address,
    ConsentManagement: consentManagement.address,
    AccessControlContract: accessControl.address
  };

  fs.writeFileSync("deployment-addresses.json", JSON.stringify(deployments, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
