import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-taskreceipttenancy",
  `Return (or --log) GelatoCore.taskReceiptTenancy() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const taskReceiptTenancy = await gelatoCore.taskReceiptTenancy();
      const taskReceiptTenancyDays = taskReceiptTenancy / 86400;
      if (log) {
        console.log(`
          \nExecutorTaskLifespan: ${taskReceiptTenancyDays} days\
          \nNetwork:               ${network.name}\n
        `);
      }
      return taskReceiptTenancy;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
