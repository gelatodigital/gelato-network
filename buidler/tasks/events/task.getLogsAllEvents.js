import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlogsallevents",
  `Return (or --log) the provider's Logs for all events on <taskArgs.contractname> for --taskArgs.txhash --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <taskArgs.contractname>. Defaults to network.deployments.<taskArgs.contractname>"
  )
  .addOptionalParam("txhash", "The tx from which to get the Log")
  .addOptionalParam(
    "fromblock",
    "The block number to search for event eventsLogs from",
    undefined, // placeholder default ...
    types.int // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // placeholder default ...
    types.int // ... only to enforce type
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.contractaddress) {
        taskArgs.contractaddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.contractname,
        });
      }
      const contractInterface = await run("ethers-interface-new", {
        contractname: taskArgs.contractname,
      });

      let eventNameSet = new Set();
      for (const eventname in contractInterface.events)
        if (/^[a-zA-Z]+$/.test(eventname)) eventNameSet.add(eventname);

      if (eventNameSet.size === 0) {
        if (taskArgs.log) {
          console.log(
            `\n Contract ${taskArgs.contractname} does not have any events \n`
          );
        }
        return [];
      }

      // Disable subTask-logging
      let loggingActivated;
      if (taskArgs.log) {
        loggingActivated = true;
        taskArgs.log = false;
      }

      const eventsLogs = [];
      for (const eventName of eventNameSet) {
        taskArgs.eventname = eventName;
        const logs = await run("event-getlogs", taskArgs);
        if (!logs.length) continue;

        if (taskArgs.txhash) {
          const logWithTxHash = logs.find(
            (log) => log.transactionHash == taskArgs.txhash
          );
          if (logWithTxHash) eventsLogs.push(logWithTxHash);
        } else {
          if (logs.length) eventsLogs.push(...logs);
        }
      }
      delete taskArgs.eventname;

      // Re-enable logging
      if (loggingActivated) taskArgs.log = true;

      if (taskArgs.log) {
        if (!eventsLogs.length) {
          console.log(
            `\n❌  No eventsLogs for ${taskArgs.contractname} from block ${
              taskArgs.fromblock ? taskArgs.fromblock : taskArgs.blockhash
            } ${
              taskArgs.toblock
                ? `to block ${taskArgs.toblock}`
                : "to latest block"
            }`
          );
        } else {
          console.log(
            `\n ✅  Events Logs for ${taskArgs.contractname} from block ${
              taskArgs.fromblock ? taskArgs.fromblock : taskArgs.blockhash
            } ${taskArgs.blockhash ? "" : `to block ${taskArgs.toblock}`}`
          );
          for (const eventlogs of eventsLogs) console.log("\n", eventlogs);
        }
      }

      return eventsLogs;
    } catch (error) {
      console.error(error, "\n");
    }
  });
