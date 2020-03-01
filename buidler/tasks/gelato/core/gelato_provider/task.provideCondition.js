import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-providecondition",
  `Sends tx to GelatoCore.provideCondition(<condition>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ conditionname, log }) => {
    try {
      const condition = await run("bre-config", {
        deployments: true,
        contractname: conditionname
      });
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const tx = await gelatoCoreContract.provideCondition(condition);
      if (log) console.log(`\n txHash provideCondition: ${tx.hash} \n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
