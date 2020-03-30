import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mintexecclaim",
  `Sends tx to GelatoCore.mintExecClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Supply '0' for AddressZero Conditions"
  )
  .addOptionalPositionalParam(
    "actionname",
    "Actionname (must be inside buidler.config) OR --actionaddress MUST be supplied."
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam("gelatoprovidermodule")
  .addOptionalPositionalParam(
    "gelatoexecutor",
    "Defaults to network addressbook default"
  )
  .addOptionalParam("conditionaddress", "", constants.AddressZero)
  .addOptionalParam("actionaddress")
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()",
    constants.HashZero
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "execclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum",
    constants.HashZero
  )
  .addOptionalParam("executorsuccessfeefactor")
  .addOptionalParam("oraclesuccessfeefactor")
  .addOptionalParam("execclaim", "The execClaim object for minting.")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (!taskArgs.execclaim) {
        // Command Line Argument Checks
        if (!taskArgs.actionname && !taskArgs.actionaddress)
          throw new Error(`\n Must supply <actionname> or --actionaddress`);
        if (
          taskArgs.conditionname !== constants.AddressZero &&
          !taskArgs.conditionname.startsWith("Condition")
        ) {
          throw new Error(
            `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
          );
        }
        if (taskArgs.actionname && !taskArgs.actionname.startsWith("Action")) {
          throw new Error(
            `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
          );
        }

        // Selected Provider and Executor
        taskArgs.gelatoprovider = await run("handleGelatoProvider", {
          gelatoprovider: taskArgs.gelatoprovider
        });
        // Condition and ConditionPayload (optional)
        if (taskArgs.conditionname !== "0") {
          if (taskArgs.conditionaddress === constants.AddressZero) {
            taskArgs.conditionaddress = await run("bre-config", {
              deployments: true,
              contractname: taskArgs.conditionname
            });
          }
          if (!taskArgs.conditionpayload) {
            taskArgs.conditionpayload = await run("handleGelatoPayload", {
              contractname: taskArgs.conditionname
            });
          }
        }

        // Action and ActionPayload
        if (!taskArgs.actionaddress) {
          taskArgs.actionaddress = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.actionname
          });
        }
        if (!taskArgs.actionpayload) {
          taskArgs.actionpayload = await run("handleGelatoPayload", {
            contractname: taskArgs.actionname,
            payload: taskArgs.actionpayload
          });
        }

        taskArgs.execclaim = {
          provider: taskArgs.gelatoprovider,
          providerModule: taskArgs.gelatoprovidermodule,
          condition: taskArgs.conditionaddress,
          action: taskArgs.actionaddress,
          conditionPayload: taskArgs.conditionpayload,
          actionPayload: taskArgs.actionpayload,
          expiryDate: taskArgs.execclaimexpirydate,
          executorSuccessShare: taskArgs.executorsuccessfeefactor,
          gasAdminSuccessShare: taskArgs.oraclesuccessfeefactor
        };
      }

      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      if (taskArgs.log) console.log("\n gc-mintexecclaiom:\n", taskArgs, "\n");

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      // mintExecClaim TX
      const mintTx = await gelatoCore.mintExecClaim(
        taskArgs.execclaim,
        taskArgs.gelatoexecutor
      );

      if (taskArgs.log)
        console.log(`\n\ntxHash gelatoCore.mintExecClaim: ${mintTx.hash}\n`);

      // Wait for tx to get mined
      const { blockHash: blockhash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.events) {
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          contractaddress: taskArgs.gelatocoreaddress,
          eventname: "LogExecClaimMinted",
          txhash: mintTx.hash,
          blockhash,
          values: true,
          stringify: true
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecClaimMinted not found");
      }

      return mintTx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
