import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexecute",
  `Calls GelatoCore.canExecute() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("executionclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "which mnemonic index should be selected for executor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalParam(
    "executionclaim",
    "Supply LogExecutionClaimMinted values in an obj"
  )
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // default
    types.number
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // default
    types.number
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      executionclaimid,
      executorindex,
      executionclaim,
      fromblock,
      toblock,
      blockhash,
      txhash,
      stringify,
      log
    }) => {
      try {
        if (!executionclaim) {
          executionclaim = await run("fetchExecutionClaim", {
            executionclaimid,
            executionclaim,
            fromblock,
            toblock,
            blockhash,
            txhash,
            stringify,
            log
          });
        }

        if (!executionclaim)
          throw new Error("Unable to fetch executionClaim from events");

        const { [executorindex]: executor } = await ethers.signers();

        if (log) console.log(`\n Executor: ${executor._address}\n`);

        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: executor,
          write: true
        });

        try {
          const canExecuteResult = await gelatoCore.canExecute(
            executionclaim.selectedProviderAndExecutor,
            executionclaim.executionClaimId,
            executionclaim.userProxy,
            executionclaim.conditionAndAction,
            executionclaim.conditionPayload,
            executionclaim.actionPayload,
            executionclaim.executionClaimExpiryDate
          );
          if (log) console.log(`\n Can Execute Result: ${canExecuteResult}\n`);
          return canExecuteResult;
        } catch (error) {
          console.error(`\n canExecute error`, error);
        }
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
