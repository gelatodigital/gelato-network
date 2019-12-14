import { sleep } from "../../helpers/sleep";

export default async taskArgs => {
  try {
    // Default for now to avoid accidentally losing addresses during deployment
    taskArgs.log = true;

    const { contractName } = taskArgs;
    const networkName = network.name;

    await run("checkContractName", { contractName, networkName });

    if (taskArgs.log)
      console.log(
        `\nStarting deployment on ${networkName.toUpperCase()} sequence for ${contractName}\n`
      );

    if (taskArgs.clean) {
      if (taskArgs.log) console.log("\nrunning npx buidler clean\n");
      await run("clean");
    }
    if (taskArgs.compile) await run("compile");

    const ContractFactory = await ethers.getContract(contractName);
    const contract = await ContractFactory.deploy();
    if (taskArgs.log)
      console.log(`\nDeployment-Tx Hash:${contract.deployTransaction.hash}\n`);
    await contract.deployed();
    if (taskArgs.log)
      console.log(
        `\n${contractName} instantiated on ${networkName} at: ${contract.address}\n`
      );
    return contract.address;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
