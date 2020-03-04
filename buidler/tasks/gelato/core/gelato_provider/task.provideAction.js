import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-provideaction",
  `Sends tx to GelatoCore.provideAction(<actionname>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("actionname")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ actionname, log }) => {
    try {
      const action = await run("bre-config", {
        deployments: true,
        contractname: actionname
      });
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const tx = await gelatoCore.provideAction(action);
      if (log) console.log(`\n txHash provideAction: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
