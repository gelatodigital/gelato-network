import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-creategelatouserproxy",
  `Sends tx to GelatoCore.createGelatoUserProxy() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam(
    "mastercopy",
    "The deployed implementation code the created proxy should point to"
  )
  .addOptionalParam("initializer", "Payload for gnosis safe proxy setup tasks")
  .addFlag("setup", "Initialize gnosis safe by calling its setup function")
  .addOptionalVariadicPositionalParam(
    "owners",
    "Supply with --setup: List of owners. Defaults to ethers signer."
  )
  .addOptionalParam(
    "threshold",
    "Supply with --setup: number of required confirmations for a Safe Tx.",
    1,
    types.int
  )
  .addOptionalParam(
    "to",
    "Supply with --setup: contract address for optional delegatecall.",
    constants.AddressZero
  )
  .addOptionalParam(
    "data",
    "Supply with --setup: payload for optional delegate call",
    "0x0"
  )
  .addOptionalParam(
    "defaultdata",
    "The name of the defaultpayload to retrieve for the 'data' field"
  )
  .addOptionalParam(
    "fallbackHandler",
    "Supply with --setup:  Handler for fallback calls to this contract",
    constants.AddressZero
  )
  .addOptionalParam(
    "paymentToken",
    "Supply with --setup:  Token that should be used for the payment (0 is ETH)",
    constants.AddressZero
  )
  .addOptionalParam(
    "payment",
    "Supply with --setup:  Value that should be paid",
    0,
    types.int
  )
  .addOptionalParam(
    "paymentReceiver",
    "Supply with --setup:  Adddress that should receive the payment (or 0 if tx.origin)t",
    constants.AddressZero
  )
  .addOptionalParam(
    "funding",
    "ETH value to be sent to newly created gelato user proxy",
    constants.HashZero,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (!taskArgs.initializer && !taskArgs.setup)
        throw new Error("Must provide initializer payload or --setup args");
      else if (taskArgs.initializer && taskArgs.setup)
        throw new Error("Provide EITHER initializer payload OR --setup args");

      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy"
        });
      }

      if (!taskArgs.mastercopy)
        throw new Error("No taskArgs.mastercopy for proxy defined");

      if (taskArgs.setup && !taskArgs.owners) {
        const signerAddress = await run("ethers", {
          signer: true,
          address: true
        });
        taskArgs.owners = [signerAddress];
        if (!Array.isArray(taskArgs.owners))
          throw new Error("Failed to convert taskArgs.owners into Array");
      }

      if (!taskArgs.data && taskArgs.defaultdata)
        taskArgs.data = await run(`gsp:scripts:defaultpayload:${defaultdata}`);

      if (taskArgs.log) console.log("\nTaskArgs:\n", taskArgs, "\n");

      if (taskArgs.setup) {
        const inputs = [
          taskArgs.owners,
          taskArgs.threshold,
          taskArgs.to,
          taskArgs.data,
          taskArgs.fallbackHandler,
          taskArgs.paymentToken,
          taskArgs.payment,
          taskArgs.paymentReceiver
        ];
        taskArgs.initializer = await run("abi-encode-withselector", {
          contractname: "IGnosisSafe",
          functionname: "setup",
          inputs
        });
      }

      if (taskArgs.log)
        console.log(`\nInitializer payload:\n${taskArgs.initializer}\n`);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const creationTx = await gelatoCore.createGelatoUserProxy(
        taskArgs.mastercopy,
        taskArgs.initializer,
        { value: taskArgs.funding, gasLimit: 3000000 }
      );

      if (taskArgs.log)
        console.log(`\ntxHash createUserProxy: ${creationTx.hash}\n`);

      const { blockHash } = await creationTx.wait();

      if (taskArgs.log) {
        const parsedLog = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogGelatoUserProxyCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true
        });
        const { user, gelatoUserProxy, userProxyFunding } = parsedLog;
        console.log(
          `\n LogGelatoUserProxyCreation\
           \n User:            ${user}\
           \n GnosisSafeProxy: ${gelatoUserProxy}\
           \n Funding          ${utils.formatEther(
             userProxyFunding.toString()
           )} ETH`
        );
      }

      return creationTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
