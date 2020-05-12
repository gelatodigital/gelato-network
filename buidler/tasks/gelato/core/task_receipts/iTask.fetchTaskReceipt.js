import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchTaskReceipt",
  `Returns the <taskReceiptArray> and if not present fetches its values from networks logs`
)
  .addPositionalParam("taskreceiptid")
  .addOptionalParam("contractaddress")
  .addOptionalParam("fromblock", "Search for event logs from block number")
  .addOptionalParam("toblock", "The block number up until which to look for")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("obj", "Return TaskReceipt in Obj form")
  .addFlag("array", "Return TaskReceipt in Array form")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log("\n fetchTaskReceipt:\n", taskArgs);

      let taskReceiptArray;
      if (taskArgs.txhash) {
        // Get single TaskReceipt log
        const taskReceiptArrayLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          contractaddress: taskArgs.contractaddress,
          eventname: "LogTaskSubmitted",
          txhash: taskArgs.txhash,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "taskReceipt",
          stringify: taskArgs.stringify,
        });

        // Throw if no og
        if (!taskReceiptArrayLog)
          throw new Error(`\n ❌ No TaskReceipt Parsed Log was found`);

        // Extract single taskReceipt array from log
        taskReceiptArray = taskReceiptArrayLog.taskReceipt;

        // Throw if not found
        if (!taskReceiptArray)
          throw new Error(`\n ❌ No TaskReceipt Array was found`);
      } else {
        // Search Logs
        const parsedLogs = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          contractaddress: taskArgs.contractaddress,
          eventname: "LogTaskSubmitted",
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "taskReceipt",
          stringify: taskArgs.stringify,
        });

        // Throw if not found
        if (!parsedLogs)
          throw new Error(`\n ❌ ❌ No TaskReceipt Parsed Logs were found`);

        // Extract single taskReceipt Obj-Array from logs
        const taskReceiptArrayLog =
          parsedLogs[parseInt(taskArgs.taskreceiptid) - 1];

        // Throw if not found
        if (!taskReceiptArrayLog)
          throw new Error(`\n ❌ ❌ No TaskReceipt Array Log was found`);

        // Extract single taskReceipt Array from Obj-Array
        taskReceiptArray = taskReceiptArrayLog.taskReceipt;
      }

      // Convert taskReceiptArray Array representation into Obj
      const taskReceiptObj = convertTaskReceiptArrayToObj(taskReceiptArray);

      // Log
      if (taskArgs.log && taskArgs.array)
        console.log(`\n TaskReceipt Array:\n`, taskReceiptArray);
      if (taskArgs.log && taskArgs.obj)
        console.log(`\n TaskReceipt Obj:\n`, taskReceiptObj);
      else if (taskArgs.log) {
        console.log(`\n TaskReceipt Array:\n`, taskReceiptArray);
        console.log(`\n TaskReceipt Obj:\n`, taskReceiptObj);
      }

      // Return
      if (taskArgs.array && !taskArgs.obj) return taskReceiptArray;
      else if (taskArgs.obj && !taskArgs.array) return taskReceiptObj;
      return { taskReceiptArray, taskReceiptObj };
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
