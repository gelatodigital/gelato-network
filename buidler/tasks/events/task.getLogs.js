import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlogs",
  `Return (or --log) the provider's eventlogs for <contractname> <eventname> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
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
    "The block number to search for event eventlogs from",
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
  .setAction(
    async ({
      contractname,
      eventname,
      contractaddress,
      blockhash,
      fromblock,
      toblock,
      log,
    }) => {
      try {
        if (!contractaddress) {
          contractaddress = await run("bre-config", {
            deployments: true,
            contractname,
          });
        }
        const contractInterface = await run("ethers-interface-new", {
          contractname,
        });

        if (!contractInterface.events[eventname]) {
          throw new Error(
            `\n Eventname "${eventname}" does not exist on ${contractname}`
          );
        }

        if (fromblock && toblock)
          if (fromblock > toblock) throw new Error("\n fromblock > toblock");

        if ((fromblock || toblock) && blockhash)
          throw new Error("\n cannot specify blocknums alongside blockHash");

        if (!blockhash) {
          const {
            filters: { defaultFromBlock, defaultToBlock },
          } = await run("bre-network", { c: true });
          if (fromblock === undefined) fromblock = defaultFromBlock;
          if (!toblock) toblock = defaultToBlock;
        }

        const filter = {
          address: contractaddress,
          blockHash: blockhash,
          fromBlock: fromblock,
          toBlock: toblock,
          topics: [contractInterface.events[eventname].topic],
        };

        const eventlogs = await ethers.provider.getLogs(filter);

        if (log) {
          if (!eventlogs.length) {
            console.log(
              `\n❌  No eventlogs for ${contractname}.${eventname} from block ${
                fromblock ? fromblock : blockhash
              } ${toblock ? `to block ${toblock}` : "to latest block"}`
            );
          } else {
            console.log(
              `\nLogs for ${contractname}.${eventname} from block ${
                fromblock ? fromblock : blockhash
              } to block ${toblock}`
            );
            for (const aLog of eventlogs) console.log("\n", aLog);
          }
        }

        if (!eventlogs.length) {
          throw new Error(
            `\n event-getlogs: ${contractname}.${eventname} not found \n`
          );
        }

        return eventlogs;
      } catch (error) {
        console.error(error, "\n");
      }
    }
  );
