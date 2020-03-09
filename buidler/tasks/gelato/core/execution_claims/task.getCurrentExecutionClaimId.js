import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-getcurrentexecutionclaimid",
  `Calls GelatoCore.getCurrentExecutionClaimId() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const currentExecutionClaimId = await gelatoCore.getCurrentExecutionClaimId();
      if (log) {
        console.log(
          `\n GelatoCore current ExecutionClaimId: ${currentExecutionClaimId}`
        );
      }
      return currentExecutionClaimId;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
