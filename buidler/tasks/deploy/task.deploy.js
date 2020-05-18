import { task, types } from "@nomiclabs/buidler/config";
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

      if (networkname == "mainnet") {
        console.log(
          "\nMAINNET action: are you sure you want to proceed? - hit 'ctrl + c' to abort\n"
        );
        await sleep(10000);
      }

      const { contractname } = taskArgs;
      await run("checkContractName", { contractname, networkname });

      const currentNonce = await ethers.provider.getTransactionCount(
        await deployer.getAddress()
      );

      if (taskArgs.log) {
        console.log(`
          \n Deployment: 🚢 \
          \n Network:  ${networkname.toUpperCase()}\
          \n Contract: ${contractname}\
          \n Deployer: ${deployer._address}\
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
        });
      } else {
        contract = await contractFactory.deploy({ nonce: currentNonce });
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
