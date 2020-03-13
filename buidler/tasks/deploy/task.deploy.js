import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

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
      const networkname = network.name;

      if (networkname == "mainnet") {
        console.log(
          "\nMAINNET action: are you sure you want to proceed? - hit 'ctrl + c' to abort\n"
        );
        await sleep(10000);
      }

      await run("checkContractName", { contractname, networkname });

      if (taskArgs.log)
        console.log(
          `\nStarting deployment on ${networkname.toUpperCase()} sequence for ${contractname}\n`
        );

      if (taskArgs.clean) {
        if (taskArgs.log) console.log("\nrunning npx buidler clean\n");
        await run("clean");
      }

      if (taskArgs.compile) await run("compile");

      // const { [2]: provider } = await ethers.signers();
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

      if (taskArgs.log) {
        console.log(
          `\n${contractname} instantiated on ${networkname} at: ${contract.address}\n`
        );
      }

      return contract.address;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
