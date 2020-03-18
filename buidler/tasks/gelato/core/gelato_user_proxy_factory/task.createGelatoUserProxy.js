import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-creategelatouserproxy",
  `Sends tx to GelatoCore.createGelatoUserProxy() or if --createtwo to .createTwoGelatoUserProxy()  on [--network] (default: ${defaultNetwork})`
)
  .addFlag("createtwo", "Call gelatoCore.createTwoGelatoUserProxy()")
  .addOptionalParam(
    "mastercopy",
    "The deployed implementation code the created proxy should point to"
  )
  .addOptionalParam(
    "saltnonce",
    "Supply for createTwoProxyAndMint()",
    42069,
    types.int
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
    "Supply with --setup: to address",
    constants.AddressZero
  )
  .addOptionalParam(
    "data",
    "Supply with --setup: payload for optional delegate call",
    constants.HashZero
  )
  .addOptionalParam(
    "defaultpayloadscript",
    "Script to retrieve --data and to be --to (if not --to supplied)"
  )
  .addOptionalParam(
    "fallbackhandler",
    "Supply with --setup:  Handler for fallback calls to this contract",
    constants.AddressZero
  )
  .addOptionalParam(
    "paymenttoken",
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
    "paymentreceiver",
    "Supply with --setup:  Adddress that should receive the payment (or 0 if tx.origin)t",
    constants.AddressZero
  )
  .addOptionalParam(
    "funding",
    "ETH value to be sent to newly created gelato user proxy",
    "0",
    types.string
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // Command Line Argument Checks
      // Gnosis Safe creation
      if (!taskArgs.initializer && !taskArgs.setup)
        throw new Error("Must provide initializer payload or --setup args");
      else if (taskArgs.initializer && taskArgs.setup)
        throw new Error("Provide EITHER initializer payload OR --setup args");
      if (taskArgs.data !== constants.HashZero && taskArgs.defaultpayloadscript)
        throw new Error("Provide EITHER --data OR --defaultpayloadscript");

      // Gelato User Proxy (GnosisSafeProxy) creation params
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

      if (taskArgs.setup && taskArgs.defaultpayloadscript) {
        taskArgs.data = await run(
          `gsp:scripts:defaultpayload:${taskArgs.defaultpayloadscript}`
        );
        if (taskArgs.to === constants.HashZero) {
          taskArgs.to = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.defaultpayloadscript
          });
        }
      }

      if (taskArgs.setup) {
        const inputs = [
          taskArgs.owners,
          taskArgs.threshold,
          taskArgs.to,
          taskArgs.data,
          taskArgs.fallbackhandler,
          taskArgs.paymenttoken,
          taskArgs.payment,
          taskArgs.paymentreceiver
        ];
        taskArgs.initializer = await run("abi-encode-withselector", {
          contractname: "IGnosisSafe",
          functionname: "setup",
          inputs
        });
      }
      // ============

      if (taskArgs.log) console.log("\nTaskArgs:\n", taskArgs, "\n");

      // GelatoCore interaction
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      let creationTx;
      if (taskArgs.createtwo) {
        creationTx = await gelatoCore.createTwoGelatoUserProxy(
          taskArgs.mastercopy,
          taskArgs.initializer,
          taskArgs.saltnonce,
          { value: utils.parseEther(taskArgs.funding), gasLimit: 3000000 }
        );
      } else {
        creationTx = await gelatoCore.createGelatoUserProxy(
          taskArgs.mastercopy,
          taskArgs.initializer,
          { value: utils.parseEther(taskArgs.funding), gasLimit: 3000000 }
        );
      }

      if (taskArgs.log)
        console.log(`\n Creation Tx Hash: ${creationTx.hash}\n`);

      const { blockHash } = await creationTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        const parsedCreateLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogGelatoUserProxyCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedCreateLog)
          console.log("\n✅ LogGelatoUserProxyCreation\n", parsedCreateLog);
        else console.log("\n❌ LogGelatoUserProxyCreation not found");
      }

      return creationTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
