import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getparsedlogs",
  `Return (or --log) the provider's parsed logs for <contractname> <eventname> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addPositionalParam(
    "eventname",
    "The name of the event in the <contractname>'s abi"
  )
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
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
  .addOptionalParam("property", "A specific key-value pair to search for")
  .addOptionalParam("filterkey", "A key to filter for")
  .addOptionalParam("filtervalue", "A value to filter for")
  .addFlag("strcmp", "Filters based on string comparison")
  .addFlag("values", "Only return the values property of the parsedLog")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (taskArgs.property && taskArgs.values)
        throw new Error("Cannot search for --property and --values");
      if (taskArgs.filtervalue && !taskArgs.filterkey && !taskArgs.property)
        throw new Error("--filtervalue with a --filterkey or --property");
      if (taskArgs.filterkey && !taskArgs.values)
        throw new Error("--filter-key/value with --values");
      if (
        taskArgs.stringify &&
        !taskArgs.values &&
        !taskArgs.filtervalue &&
        !taskArgs.property
      )
        throw new Error("--stringify --values [--filtervalue] or --property");

      let loggingActivated;
      if (taskArgs.log) {
        loggingActivated = true;
        taskArgs.log = false;
      }

      const logs = await run("event-getlogs", taskArgs);

      if (loggingActivated) taskArgs.log = true;

      if (!logs) {
        if (taskArgs.log) {
          console.log(
            `❌  No Logs for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
        }
        return undefined;
      }

      let parsedLogs = await run("ethers-interface-parseLogs", {
        contractname: taskArgs.contractname,
        logs
      });

      // Filter/Mutate parsedLogs
      if (!parsedLogs.length) {
        if (taskArgs.log) {
          console.log(
            `❌  No Parsed Logs for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
          return undefined;
        }
      } else {
        if (taskArgs.values) {
          // filterkey/value
          if (taskArgs.filterkey) {
            parsedLogs = parsedLogs.filter(parsedLog =>
              checkNestedObj(parsedLog, "values", taskArgs.filterkey)
            );
            if (taskArgs.filtervalue) {
              parsedLogs = parsedLogs.filter(parsedLog => {
                const filteredValue = parsedLog.values[taskArgs.filterkey];
                return taskArgs.strcmp
                  ? filteredValue.toString() === taskArgs.filtervalue.toString()
                  : filteredValue == taskArgs.filtervalue;
              });
            }
          }
          // Mutate parsedLog to contain values only
          for (const [index, parsedLog] of parsedLogs.entries()) {
            const copy = {};
            for (const key in parsedLog.values) {
              copy[key] = taskArgs.stringify
                ? parsedLog.values[key].toString()
                : parsedLog.values[key];
            }
            parsedLogs[index] = copy;
          }
        } else if (taskArgs.property) {
          if (taskArgs.filtervalue) {
            parsedLogs = parsedLogs.filter(parsedLog => {
              const filteredValue = getNestedObj(
                parsedLog,
                "values",
                taskArgs.property
              );
              return taskArgs.strcmp
                ? filteredValue.toString() === taskArgs.filtervalue.toString()
                : filteredValue == taskArgs.filtervalue;
            });
          }
          for (const [index, parsedLog] of parsedLogs.entries()) {
            parsedLogs[index] = {
              [taskArgs.property]: taskArgs.stringify
                ? parsedLog.values[taskArgs.property].toString()
                : parsedLog.values[taskArgs.property]
            };
          }
        }
      }
      // Logging
      if (taskArgs.log) {
        if (parsedLogs.length) {
          console.log(
            `\n Parsed Logs for ${taskArgs.contractname}.${taskArgs.eventname}\n`
          );
          for (const parsedLog of parsedLogs) console.log("\n", parsedLog);
        } else {
          console.log(
            `\n ❌ No Parsed Logs for ${taskArgs.contractname}.${taskArgs.eventname}\
             \n taskArgs:\n`,
            taskArgs
          );
        }
      }
      // Return (filtered) (mutated) parsedLogs
      return parsedLogs.length ? parsedLogs : undefined;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
