import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-currentexecclaimid",
  `Calls GelatoCore.currentExecClaimId() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const currentExecClaimId = await gelatoCore.currentExecClaimId();
      if (log) {
        console.log(
          `\n GelatoCore current ExecClaimId: ${currentExecClaimId}`
        );
      }
      return currentExecClaimId;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
