import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexec-exec",
  `Calls GelatoCore.canExec prior to .exec on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("taskreceiptid")
  .addOptionalPositionalParam(
    "executorindex",
    "which mnemonic index should be selected for gelatoExecutor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalParam("taskreceipt", "Supply LogTaskSubmitted values in an obj")
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // default
    types.int
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // default
    types.int
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      const canExecuteReturn = await run("gc-canexec", taskArgs);
      if (canExecuteReturn === "ok") await run("gc-exec", taskArgs);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
