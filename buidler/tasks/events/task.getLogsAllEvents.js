import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlogsallevents",
  `Return (or --log) the provider's Logs for all events on <contractname> for --txhash --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
  )
  .addOptionalParam("txhash", "The tx from which to get the Log")
  .addOptionalParam(
    "fromblock",
    "The block number to search for event eventsLogs from",
    undefined, // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    "latest", // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      contractname,
      txhash,
      contractaddress,
      blockhash,
      fromblock,
      toblock,
      log
    }) => {
      try {
        if (!contractaddress) {
          contractaddress = await run("bre-config", {
            deployments: true,
            contractname
          });
        }
        const contractInterface = await run("ethers-interface-new", {
          contractname
        });

        let eventNameSet = new Set();
        for (const eventname in contractInterface.events)
          if (/^[a-zA-Z]+$/.test(eventname)) eventNameSet.add(eventname);

        if (eventNameSet.size === 0) {
          throw new Error(
            `\n Contract ${contractname} does not have any events \n`
          );
        }

        if (fromblock && toblock)
          if (fromblock > toblock) throw new Error("\n fromblock > toblock");

        if ((fromblock || toblock) && blockhash)
          throw new Error("\n Cannot specify blocknums alongside blockHash");

        if (!blockhash) {
          const {
            filters: { defaultFromBlock, defaultToBlock }
          } = await run("bre-network", { c: true });
          if (fromblock === undefined) fromblock = defaultFromBlock;
          if (!toblock) toblock = defaultToBlock;
        }

        const eventFilters = [];
        for (const eventName of eventNameSet) {
          const filter = {
            address: contractaddress,
            blockHash: blockhash,
            fromBlock: fromblock,
            toBlock: toblock,
            topics: [contractInterface.events[eventName].topic]
          };
          eventFilters.push(filter);
        }

        const eventsLogs = [];
        for (const filter of eventFilters) {
          const eventlogs = await ethers.provider.getLogs(filter);
          if (txhash) {
            const logWithTxHash = eventlogs.find(
              log => log.transactionHash == txhash
            );
            if (logWithTxHash) eventsLogs.push(logWithTxHash);
          } else {
            eventsLogs.push(eventlogs);
          }
        }

        if (log) {
          if (!eventsLogs.length) {
            console.log(
              `\n❌  No eventsLogs for ${contractname} from block ${
                fromblock ? fromblock : blockhash
              } ${toblock ? `to block ${toblock}` : "to latest block"}`
            );
          } else {
            console.log(
              `\n Events Logs for ${contractname} from block ${
                fromblock ? fromblock : blockhash
              } to block ${toblock}`
            );
            for (const eventlogs of eventsLogs) console.log("\n", eventlogs);
          }
        }

        if (!eventsLogs.length) {
          throw new Error(
            `\n event-getlogsallevents: ${contractname} no events found \n`
          );
        }

        return eventsLogs;
      } catch (error) {
        console.error(error, "\n");
      }
    }
  );
