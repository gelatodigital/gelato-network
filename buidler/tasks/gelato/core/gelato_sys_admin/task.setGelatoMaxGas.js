import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-setgelatomaxgas",
  `Sends tx to GelatoCore.setGelatoGasPrice(<lifespan>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "maxgas",
    "The new maxgas which is used to settle payments between providers and executors"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ maxgas, log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const tx = await gelatoCore.setMaxGas(maxgas);
      if (log) console.log(`\n\ntxHash setGelatoGasPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
