import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getparsedlog",
  `Return (or --log) the provider's Parsed Log for <contractname> <eventname> <txhash> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addPositionalParam(
    "eventname",
    "The name of the event in the <contractname>'s abi"
  )
  .addPositionalParam("txhash", "The tx from which to get the Parsed Log")
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
  )
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("property", "A specific key-value pair to search for")
  .addOptionalParam("filterkey", "A key to filter for")
  .addOptionalParam("filtervalue", "A value to filter for")
  .addFlag("strcmp", "Filters based on string comparison")
  .addFlag("values")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (taskArgs.property && taskArgs.values)
        throw new Error("\n Cannot search for --property and --values");
      if (taskArgs.filtervalue && !taskArgs.filterkey && !taskArgs.property)
        throw new Error("\n --filtervalue with a --filterkey or --property");
      if (taskArgs.filterkey && !taskArgs.values)
        throw new Error("\n --filter-key/value with --values");
      if (
        taskArgs.stringify &&
        !taskArgs.values &&
        !taskArgs.filtervalue &&
        !taskArgs.property
      ) {
        throw new Error(
          "\n --stringify --values [--filtervalue] or --property"
        );
      }

      if (taskArgs.log) console.log("\n event-getparsedlog", taskArgs, "\n");

      let loggingActivated;
      if (taskArgs.log) {
        loggingActivated = true;
        taskArgs.log = false;
      }

      const logWithTxHash = await run("event-getlog", taskArgs);

      if (loggingActivated) taskArgs.log = true;

      if (!logWithTxHash) {
        if (taskArgs.log) {
          console.log(
            `\n ❌  No Log for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
        }
        throw new Error(
          `\n event-getparsedlog: ${taskArgs.contractname} ${taskArgs.eventname} logWithTxHash not found \n`
        );
      }

      let parsedLogWithTxHash = await run("ethers-interface-parseLogs", {
        contractname: taskArgs.contractname,
        eventlogs: logWithTxHash
      });

      if (!parsedLogWithTxHash) {
        if (taskArgs.log) {
          console.log(
            `❌  No Parsed Log for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
          throw new Error(
            `\n event-getparsedlog: ${taskArgs.contractname} ${taskArgs.eventname} not found \n`
          );
        }
      } else {
        if (taskArgs.values) {
          // Filtering
          if (taskArgs.filterkey) {
            if (
              !checkNestedObj(parsedLogWithTxHash, "values", taskArgs.filterkey)
            )
              parsedLogWithTxHash = undefined;
            if (taskArgs.filtervalue) {
              const filteredValue = getNestedObj(
                parsedLogWithTxHash,
                "values",
                taskArgs.filterkey
              );
              if (
                taskArgs.strcmp
                  ? filteredValue.toString() !== taskArgs.filtervalue.toString()
                  : filteredValue != taskArgs.filtervalue
              )
                parsedLogWithTxHash = undefined;
            }
          }
          if (parsedLogWithTxHash) {
            const copy = {};
            for (const key in parsedLogWithTxHash.values) {
              copy[key] = taskArgs.stringify
                ? parsedLogWithTxHash.values[key].toString()
                : parsedLogWithTxHash.values[key];
            }
            parsedLogWithTxHash = copy;
          }
        } else if (taskArgs.property) {
          if (taskArgs.filtervalue) {
            const filteredValue = getNestedObj(
              parsedLogWithTxHash,
              "values",
              taskArgs.property
            );
            if (
              taskArgs.strcmp
                ? filteredValue.toString() !== taskArgs.filtervalue.toString()
                : filteredValue != taskArgs.filtervalue
            )
              parsedLogWithTxHash = undefined;
          }
          if (parsedLogWithTxHash) {
            parsedLogWithTxHash = {
              [taskArgs.property]: taskArgs.stringify
                ? parsedLogWithTxHash.values[taskArgs.property].toString()
                : parsedLogWithTxHash.values[taskArgs.property]
            };
          }
        }
      }
      // Logging
      if (taskArgs.log) {
        if (parsedLogWithTxHash) {
          console.log(
            `\n Parsed Log for ${taskArgs.contractname}.${taskArgs.eventname}\
             \n txHash: ${taskArgs.txhash}\n`,
            parsedLogWithTxHash
          );
        } else {
          console.log(
            `\n ❌ No Parsed Log for ${taskArgs.contractname}.${taskArgs.eventname}\
             \n txHash: ${taskArgs.txhash}\
             \n taskArgs:\n`,
            taskArgs
          );
        }
      }
      // Return (filtered) (mutated) parsedLog
      if (!parsedLogWithTxHash) {
        throw new Error(
          `\n event-getparsedlog: ${taskArgs.contractname} ${taskArgs.eventname} not found \n`
        );
      }
      return parsedLogWithTxHash;
    } catch (error) {
      console.error(error, "\n");
    }
  });
