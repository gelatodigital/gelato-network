import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-assignproviderexecutor",
  `Sends tx to GelatoCore.assignProviderExecutor(<gelatoexecutor>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("gelatoexecutor")
  .addFlag("events", "Logs events logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatoexecutor, events, log }) => {
    try {
      gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor
      });
      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true
      });
      const tx = await gelatoCore.assignProviderExecutor(gelatoexecutor);
      if (log) console.log(`\n txHash assignProviderExecutor: ${tx.hash}\n`);
      const { blockHash: blockhash } = await tx.wait();

      if (events) {
        await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogAssignProviderExecutor",
          txhash: tx.hash,
          blockhash,
          log: true
        });
      }
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
