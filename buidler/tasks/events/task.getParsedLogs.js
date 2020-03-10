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
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addOptionalParam("property", "A specific key-value pair to search for")
  .addOptionalParam("filterkey", "A key to filter for")
  .addOptionalParam("filtervalue", "A value to filter for")
  .addFlag("values")
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
      if (taskArgs.stringify && !taskArgs.property)
        throw new Error("--stringify --property");

      let loggingActivated;
      if (taskArgs.log) {
        loggingActivated = true;
        taskArgs.log = false;
      }

      let logs, logWithTxHash;
      if (taskArgs.txhash) logWithTxHash = await run("event-getlogs", taskArgs);
      else logs = await run("event-getlogs", taskArgs);

      if (loggingActivated) taskArgs.log = true;

      if (!logs && !logWithTxHash) {
        if (taskArgs.log) {
          console.log(
            `No logs for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
        }
        return undefined;
      }

      let parsedLogs, parsedLogWithTxHash;
      if (logWithTxHash) {
        parsedLogWithTxHash = await run("ethers-interface-parseLogs", {
          contractname: taskArgs.contractname,
          logs: logWithTxHash
        });
      } else {
        parsedLogs = await run("ethers-interface-parseLogs", {
          contractname: taskArgs.contractname,
          logs
        });
      }

      if (!parsedLogs && !parsedLogWithTxHash) {
        if (taskArgs.log) {
          console.log(
            `No logs for ${taskArgs.contractname}.${taskArgs.eventname}`
          );
          return undefined;
        }
      } else {
        if (!taskArgs.txhash) {
          // No txhash filter
          if (taskArgs.log) {
            console.log(
              `\n Parsed Logs for ${taskArgs.contractname}.${taskArgs.eventname}\n`
            );
          }
          if (taskArgs.values) {
            // filterkey/value
            if (taskArgs.filterkey) {
              parsedLogs = parsedLogs.filter(parsedLog =>
                checkNestedObj(parsedLog, "values", taskArgs.filterkey)
              );
              if (taskArgs.filtervalue) {
                parsedLogs = parsedLogs.filter(parsedLog => {
                  const filteredValue = getNestedObj(
                    parsedLog,
                    "values",
                    taskArgs.filterkey
                  );
                  return filteredValue == taskArgs.filtervalue;
                });
              }
            }
            for (const index in parsedLogs)
              parsedLogs[index] = parsedLogs[index].values;
            if (taskArgs.log)
              for (const values of parsedLogs) console.log("\n", values);
            return parsedLogs;
          } else if (taskArgs.property) {
            if (taskArgs.filtervalue) {
              parsedLogs = parsedLogs.filter(parsedLog => {
                const filteredValue = getNestedObj(
                  parsedLog,
                  "values",
                  taskArgs.property
                );
                return filteredValue == taskArgs.filtervalue;
              });
            }
            for (const [index, parsedLog] of parsedLogs.entries()) {
              if (taskArgs.log) {
                console.log(
                  `\n ${taskArgs.property}: `,
                  taskArgs.stringify
                    ? parsedLog.values[taskArgs.property].toString()
                    : parsedLog.values[taskArgs.property]
                );
              }
              parsedLogs[index] = taskArgs.stringify
                ? parsedLog.values[taskArgs.property].toString()
                : parsedLog.values[taskArgs.property];
            }
            return parsedLogs;
          } else {
            for (const parsedLog of parsedLogs)
              if (taskArgs.log) console.log("\n", parsedLog);
            return parsedLogs;
          }
        } else {
          // txhash filter
          if (taskArgs.values) {
            // Filtering
            if (taskArgs.filterkey) {
              if (
                !checkNestedObj(
                  parsedLogWithTxHash,
                  "values",
                  taskArgs.filterkey
                )
              )
                parsedLogWithTxHash = undefined;
              if (taskArgs.filtervalue) {
                const filteredValue = getNestedObj(
                  parsedLogWithTxHash,
                  "values",
                  taskArgs.filterkey
                );
                if (filteredValue != taskArgs.filtervalue)
                  parsedLogWithTxHash = undefined;
              }
            }
            if (parsedLogWithTxHash) {
              if (taskArgs.log) console.log("\n", parsedLogWithTxHash.values);
              return parsedLogWithTxHash.values;
            }
          } else if (taskArgs.property) {
            if (taskArgs.filtervalue) {
              const filteredValue = getNestedObj(
                parsedLogWithTxHash,
                "values",
                taskArgs.property
              );
              if (filteredValue != taskArgs.filtervalue)
                parsedLogWithTxHash = undefined;
            }
            if (parsedLogWithTxHash) {
              if (taskArgs.log) {
                console.log(
                  `\n ${taskArgs.property}: `,
                  taskArgs.stringify
                    ? parsedLogWithTxHash.values[taskArgs.property].toString()
                    : parsedLogWithTxHash.values[taskArgs.property]
                );
              }
              return taskArgs.stringify
                ? parsedLogWithTxHash.values[taskArgs.property].toString()
                : parsedLogWithTxHash.values[taskArgs.property];
            }
          } else {
            if (taskArgs.log) {
              console.log(
                `\nParsed Log for ${taskArgs.contractname}.${taskArgs.eventname} with tx-Hash ${taskArgs.txhash}:\
                 \n`,
                parsedLogWithTxHash
              );
            }
            return parsedLogWithTxHash;
          }
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
