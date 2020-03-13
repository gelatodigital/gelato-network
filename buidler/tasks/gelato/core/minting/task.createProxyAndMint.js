import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-createproxyandmint",
  `Sends tx to GelatoCore.createProxyAndMint() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Defaults to address 0 for self-conditional actions",
    constants.AddressZero,
    types.string
  )
  .addOptionalPositionalParam(
    "actionname",
    "This param MUST be supplied. Must exist inside buidler.config"
  )
  .addOptionalPositionalParam(
    "selectedprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "selectedexecutor",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handlePayload()"
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handlePayload()"
  )
  .addOptionalPositionalParam(
    "executionclaimexpirydate",
    "Defaults to 0 for selectedexecutor's maximum",
    constants.HashZero
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
    "The name of the defaultpayload script to retrieve 'data'"
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
      // Condition and Action for minting
      if (!taskArgs.actionname) throw new Error(`\n Must supply Action Name`);
      if (
        taskArgs.conditionname != constants.AddressZero &&
        !taskArgs.conditionname.startsWith("Condition")
      ) {
        throw new Error(
          `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      if (!taskArgs.actionname.startsWith("Action")) {
        throw new Error(
          `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      // Gnosis Safe creation
      if (!taskArgs.initializer && !taskArgs.setup)
        throw new Error("Must provide initializer payload or --setup args");
      else if (taskArgs.initializer && taskArgs.setup)
        throw new Error("Provide EITHER initializer payload OR --setup args");

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

      if (
        taskArgs.setup &&
        !taskArgs.data &&
        taskArgs.defaultpayloadscript &&
        !taskArgs.to
      ) {
        taskArgs.data = await run(
          `gsp:scripts:defaultpayload:${defaultpayloadscript}`
        );
        taskArgs.to = await run("bre-config", {
          deployments: true,
          contractname: `${tasksArgs.defaultpayloadscript}`
        });
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

      if (taskArgs.log)
        console.log(`\nInitializer payload:\n${taskArgs.initializer}\n`);
      // ============

      // ==== GelatoCore.mintExecutionClaim Params ====
      // Selected Provider and Executor
      const selectedProvider = await run("handleProvider", {
        provider: taskArgs.selectedprovider
      });
      // const { [2]: selectedProvider } = await ethers.signers();
      const selectedExecutor = await run("handleExecutor", {
        selectedExecutor: taskArgs.selectedexecutor
      });
      // const { [1]: selectedExecutor } = await ethers.signers();
      // Condition and ConditionPayload (optional)
      let conditionAddress;
      let conditionPayload = constants.HashZero;
      if (taskArgs.conditionname != constants.AddressZero) {
        conditionAddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.conditionname
        });
        // conditionAddress = condition.address;
        conditionPayload = await run("handlePayload", {
          contractname: taskArgs.conditionname
        });
      }
      // Action and ActionPayload
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });
      const actionPayload = await run("handlePayload", {
        contractname: taskArgs.actionname
      });
      /*
      function createProxyAndMint(
        address _mastercopy,
        bytes calldata _initializer,
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
    */

      // const actionPayload = await run(
      //   `gc-mint:defaultpayload:${taskArgs.actionname}`
      // );
      // ============

      // GelatoCore interaction
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      if (taskArgs.log)
        console.log(`
          \MasterCopy: ${taskArgs.mastercopy}\n
          \Initializer: ${taskArgs.initializer}\n
          \providerAndSelector: ${[selectedProvider, selectedExecutor]}\n
          \conditionAction: ${[conditionAddress, actionAddress]}\n
          \conditionPayload: ${conditionPayload}\n
          \actionPayload: ${actionPayload}\n
          \ExecutionclaimExpiryDate: ${taskArgs.executionclaimexpirydate}\n
          \Funding: ${taskArgs.funding}\n
          \Script Address: ${taskArgs.to}\n
        `);

      if (taskArgs.log) console.log("\nTaskArgs:\n", taskArgs, "\n");

      const creationTx = await gelatoCore.createProxyAndMint(
        taskArgs.mastercopy,
        taskArgs.initializer,
        [selectedProvider, selectedExecutor],
        [conditionAddress, actionAddress],
        conditionPayload,
        actionPayload,
        taskArgs.executionclaimexpirydate,
        {
          value: ethers.utils.bigNumberify(taskArgs.funding),
          gasLimit: 3000000
        }
      );

      if (taskArgs.log)
        console.log(`\ntxHash createProxyAndMint: ${creationTx.hash}\n`);

      const { blockHash } = await creationTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        const parsedCreateLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogGelatoUserProxyCreation",
          txhash: creationTx.hash,
          blockHash,
          values: true
        });
        const { user, gelatoUserProxy, userProxyFunding } = parsedCreateLog;
        console.log(
          `\n LogGelatoUserProxyCreation\
           \n User:            ${user}\
           \n GnosisSafeProxy: ${gelatoUserProxy}\
           \n Funding          ${utils.formatEther(
             userProxyFunding.toString()
           )} ETH`
        );

        const parsedMintLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          txhash: creationTx.hash,
          blockHash,
          values: true
        });
        console.log("\n LogExecutionClaimMinted\n", parsedMintLog);
      }

      return creationTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
