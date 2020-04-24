import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchTaskReceipt",
  `Returns the <taskReceipt> and if not present fetches its values from networks logs`
)
  .addPositionalParam("taskreceiptid")
  .addFlag("taskreceipthash", "Als return the taskReceiptHash")
  .addOptionalParam("fromblock", "Search for event logs from block number")
  .addOptionalParam("toblock", "The block number up until which to look for")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log("\n fetchTaskReceipt:\n", taskArgs);

      let taskReceipt;
      if (taskArgs.txhash) {
        // Search Log with txhash
        taskReceipt = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogTaskSubmitted",
          txhash: taskArgs.txhash,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "taskReceipt",
          stringify: taskArgs.stringify,
        });
      } else {
        // Search Logs
        const taskReceipts = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogTaskSubmitted",
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "taskReceipt",
          stringify: taskArgs.stringify,
        });
        taskReceipt =
          taskReceipts[parseInt(taskArgs.taskreceiptid) - 1].taskReceipt;
        if (!taskReceipts)
          throw new Error(`\n ❌ TaskReceipt not found in logs`);

        // This will only work with new ethers update that uses annotated arrays for structs
        /*taskReceipt = taskReceipts.filter(
          taskReceipt => taskReceipt.id == taskArgs.taskreceiptid
        );*/
      }

      if (!taskReceipt)
        throw new Error(`\n ❌ No TaskReceipt logs where found`);
      /*if (!taskReceipt.id.toString() == taskArgs.taskreceiptid.toString()) {
        throw new Error(
          `\n No TaskReceipt with id ${taskArgs.taskreceiptid} was found`
        );
      }*/

      if (taskArgs.log) console.log(`\n TaskReceipt:\n`, taskReceipt);

      return taskReceipt;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
