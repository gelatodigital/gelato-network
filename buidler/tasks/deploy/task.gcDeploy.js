import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-deploy",
  `Deploys <contractname> to [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "the name of the contract artifact to deploy"
  )
  .addOptionalVariadicPositionalParam(
    "constructorargs",
    "A collection of arguments to pass to the contract constructor",
    undefined,
    types.json
  )
  .addOptionalParam(
    "signerindex",
    "The Signer accounts index to use for deployment. This can be used for Ownable contracts.",
    0,
    types.int
  )
  .addOptionalParam(
    "signer",
    "The Signer accounts index to use for deployment. This can be used for Ownable contracts.",
    undefined,
    types.json
  )
  .addOptionalParam(
    "value",
    "ETH amount to send to payable constructor",
    0,
    types.int
  )
  .addOptionalParam(
    "nonceaddition",
    "When deploying multiple contracts, this can be used to increment the nonce artifically",
    0,
    types.int
  )
  .addFlag("clean")
  .addFlag("compile", "Compile before deploy")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs to stdout")
  .setAction(async (taskArgs) => {
    try {
      // Default for now to avoid accidentally losing addresses during deployment
      const networkname = network.name;
      if (networkname !== "buidlerevm") {
        taskArgs.log = true;
        taskArgs.compile = true;
      }

      if (taskArgs.value != 0)
        taskArgs.value = utils.parseEther(taskArgs.value.toString());

      if (taskArgs.log) console.log("\n deploy taskArgs:", taskArgs, "\n");

      let deployer;
      if (taskArgs.signerindex && taskArgs.signer)
        throw Error("Can't have both signer and signer index");
      if (!taskArgs.signerindex && !taskArgs.signer)
        [deployer] = await ethers.getSigners();
      if (taskArgs.signerindex && !taskArgs.signer) {
        const { [taskArgs.signerindex]: _deployer } = await ethers.getSigners();
        deployer = _deployer;
      }
      if (!taskArgs.signerindex && taskArgs.signer) deployer = taskArgs.signer;

      let currentNonce = await ethers.provider.getTransactionCount(
        await deployer.getAddress()
      );
      currentNonce = currentNonce + taskArgs.nonceaddition;

      if (networkname == "mainnet") {
        console.log(
          "\nMAINNET action: are you sure you want to proceed? - hit 'ctrl + c' to abort\n"
        );
        console.log(
          `gasPrice: ${utils.formatUnits(network.config.gasPrice, "gwei")} gwei`
        );
        console.log("currentNonce: ", currentNonce);
        console.log("deployerAddress: ", await deployer.getAddress());
        await sleep(10000);
      }

      const { contractname } = taskArgs;
      await run("checkContractName", { contractname, networkname });

      if (taskArgs.log) {
        console.log(`
          \n Deployment: 🚢 \
          \n Network:  ${networkname.toUpperCase()} ❗\
          \n Contract: ${contractname}\
          \n Deployer: ${await deployer.getAddress()}\
          \n Nonce:    ${currentNonce}\n
        `);
      }

      if (taskArgs.clean) {
        if (taskArgs.log) console.log("\nrunning npx buidler clean\n");
        await run("clean");
      }

      if (taskArgs.compile) await run("compile");

      const contractFactory = await ethers.getContractFactory(
        contractname,
        deployer
      );
      let contract;

      if (taskArgs.constructorargs) {
        const args = taskArgs.constructorargs;
        contract = await contractFactory.deploy(...args, {
          nonce: currentNonce,
          gasPrice: network.config.gasPrice,
          value: taskArgs.value,
        });
      } else {
        contract = await contractFactory.deploy({
          nonce: currentNonce,
          gasPrice: network.config.gasPrice,
          value: taskArgs.value,
        });
      }

      if (taskArgs.log) {
        console.log(
          `\nDeployment-Tx Hash: ${contract.deployTransaction.hash}\n`
        );
      }

      const {
        deployTransaction: { hash: txhash, blockHash: blockhash },
      } = await contract.deployed();

      if (taskArgs.log) {
        console.log(
          `\n${contractname} instantiated on ${networkname} at: ${contract.address}\n`
        );
      }

      if (taskArgs.events) {
        try {
          await run("event-getparsedlogsallevents", {
            contractname: taskArgs.contractname,
            contractaddress: contract.address,
            txhash,
            blockhash,
            log: true,
          });
        } catch (error) {
          console.error(`\n Error during event-getparsedlogsallevents \n`);
        }
      }

      return contract;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
