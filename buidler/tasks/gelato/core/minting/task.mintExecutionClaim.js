import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Defaults to address 0 for self-conditional actions"
  )
  .addOptionalPositionalParam(
    "actionname",
    "This param MUST be supplied. Must exist inside buidler.config"
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "gelatoexecutor",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "executionclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum",
    constants.HashZero
  )
  .addOptionalParam("conditionaddress", "", constants.AddressZero)
  .addOptionalParam("actionaddress")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // Command Line Argument Checks
      if (!taskArgs.actionname && !taskArgs.actionaddress)
        throw new Error(`\n Must supply <actionname> or --actionaddress`);
      if (
        taskArgs.conditionname &&
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
      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      // Condition and ConditionPayload (optional)
      if (taskArgs.conditionname) {
        if (taskArgs.conditionaddress === constants.AddressZero) {
          taskArgs.conditionAddress = await run("bre-config", {
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

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      // mintExecutionClaim TX
      const mintTx = await gelatoCore.mintExecutionClaim(
        [taskArgs.gelatoprovider, taskArgs.gelatoexecutor],
        [taskArgs.conditionaddress, taskArgs.actionaddress],
        taskArgs.actionaddress,
        taskArgs.conditionaddress,
        taskArgs.executionclaimexpirydate
      );

      if (taskArgs.log) {
        console.log(
          `\n\ntxHash gelatoCore.mintExecutionClaim: ${mintTx.hash}\n`
        );
      }

      // Wait for tx to get mined
      const { blockHash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          txhash: mintTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecutionClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecutionClaimMinted not found");
      }

      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
