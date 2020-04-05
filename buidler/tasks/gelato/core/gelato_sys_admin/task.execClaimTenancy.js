import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-execclaimtenancy",
  `Return (or --log) GelatoCore.execClaimTenancy() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const execClaimTenancy = await gelatoCore.execClaimTenancy();
      const execClaimTenancyDays = execClaimTenancy / 86400;
      if (log) {
        console.log(`
          \nExecutorClaimLifespan: ${execClaimTenancyDays} days\
          \nNetwork:               ${network.name}\n
        `);
      }
      return execClaimTenancy;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
