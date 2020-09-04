import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-set-sysadmin",
  `Sends tx to GelatoCore.transferOwnership(<newOwner>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("owner", "The owner")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ owner, log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });

      const currentOwner = await gelatoCore.owner();
      console.log(`Old Owner: ${currentOwner}\n`);
      console.log(`New Owner: ${owner}\n`);
      const tx = await gelatoCore.transferOwnership(owner);
      if (log) console.log(`\n\ntxHash setGelatoGasPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
