import { sleep } from "../../helpers/sleep";

export default async (contractName, networkName, run) => {
  try {
    await run("checkContractName", { contractName, networkName });

    console.log(
      `\nStarting deployment on ${networkName.toUpperCase()} sequence for ${contractName}\n`
    );

    await run("compile");

    const ContractFactory = await ethers.getContract(contractName);
    const contract = await ContractFactory.deploy();
    console.log(`\nDeployment-Tx Hash:${contract.deployTransaction.hash}\n`);
    await contract.deployed();
    console.log(
      `\n${contractName} instantiated on ${networkName} at: ${contract.address}\n`
    );
    return contract.address;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
