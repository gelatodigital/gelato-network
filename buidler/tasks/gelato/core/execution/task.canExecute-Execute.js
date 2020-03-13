import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexecute-execute",
  `Calls GelatoCore.canExecute prior to .execute on [--network] (default: ${defaultNetwork})`
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
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      const canExecuteReturn = await run("gc-canexecute", taskArgs);
      if (canExecuteReturn === "ok") await run("gc-execute", taskArgs);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
