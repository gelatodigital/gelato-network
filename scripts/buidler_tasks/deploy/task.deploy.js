import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import sleep from "../../helpers/async/sleep";

export default task(
  "deploy",
  `Deploys <contractname> to [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "the name of the contract artifact to deploy"
  )
  .addOptionalVariadicPositionalParam(
    "constructorargs",
    "A collection of arguments to pass to the contract constructor"
  )
  .addFlag("clean")
  .addFlag("compile", "Compile before deploy")
  .addFlag("log", "Logs to stdout")
  .setAction(async taskArgs => {
    try {
      // Default for now to avoid accidentally losing addresses during deployment
      taskArgs.log = true;
      taskArgs.compile = true;

      const { contractname } = taskArgs;
      const networkName = network.name;

      if (networkName == "mainnet") {
        console.log(
          "MAINNET action: are you sure you want to proceed? - hit 'ctrl + c' to abort"
        );
        await sleep(10000);
      }

      await run("checkContractName", { contractname, networkName });

      if (taskArgs.log)
        console.log(
          `\nStarting deployment on ${networkName.toUpperCase()} sequence for ${contractname}\n`
        );

      if (taskArgs.clean) {
        if (taskArgs.log) console.log("\nrunning npx buidler clean\n");
        await run("clean");
      }

      if (taskArgs.compile) await run("compile");

      const ContractFactory = await ethers.getContract(contractname);
      let contract;
      if (taskArgs.constructorargs) {
        const args = taskArgs.constructorargs;
        contract = await ContractFactory.deploy(...args);
      } else {
        contract = await ContractFactory.deploy();
      }

      if (taskArgs.log)
        console.log(
          `\nDeployment-Tx Hash: ${contract.deployTransaction.hash}\n`
        );

      await contract.deployed();

      if (taskArgs.log)
        console.log(
          `\n${contractname} instantiated on ${networkName} at: ${contract.address}\n`
        );

      return contract.address;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
