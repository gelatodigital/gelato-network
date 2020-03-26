import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlogs",
  `Return (or --log) the provider's logs for <contractname> <eventname> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
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
    undefined,  // placeholder default ...
    types.number  // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined,  // placeholder default ...
    types.number  // ... only to enforce type
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

        if (!contractInterface.events[eventname]) {
          throw new Error(
            `\n Eventname "${eventname}" does not exist on ${contractname}`
          );
        }

        if (fromblock && toblock)
          if (fromblock > toblock) throw new Error("\n fromblock > toblock");

        if ((fromblock || toblock) && blockhash)
          throw new Error("\n cannot specify blocknums alongside blockHash");

        const {
          filters: { defaultFromBlock, defaultToBlock }
        } = await run("bre-network", { c: true });

        if (!fromblock && !blockhash) fromblock = defaultFromBlock;
        if (!toblock && !blockhash) toblock = defaultToBlock;

        const filter = {
          address: contractaddress,
          blockHash: blockhash,
          fromBlock: fromblock,
          toBlock: toblock,
          topics: [contractInterface.events[eventname].topic]
        };

        const logs = await ethers.provider.getLogs(filter);

        if (log) {
          if (!logs.length) {
            console.log(
              `\n❌  No logs for ${contractname}.${eventname} from block ${
                fromblock ? fromblock : blockhash
              } ${toblock ? `to block ${toblock}` : "to latest block"}`
            );
          } else {
            console.log(
              `\nLogs for ${contractname}.${eventname} from block ${
                fromblock ? fromblock : blockhash
              } to block ${toblock}`
            );
            for (const aLog of logs) console.log("\n", aLog);
          }
        }
        return logs.length ? logs : undefined;
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
