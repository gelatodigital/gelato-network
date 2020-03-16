import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnterPortfolioRebalancing",
  `Returns a hardcoded payload for ScriptEnterPortfolioRebalancing`
)
  .addOptionalParam("gelatocoreaddress")
  .addOptionalParam("gelatoprovider")
  .addOptionalParam("gelatoexecutor")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      // Handle taskArgs defaults
      if (!taskArgs.gelatocoreaddress) {
        taskArgs.gelatocoreaddress = await run("bre-config", {
          deployments: true,
          contractname: "GelatoCore"
        });
      }
      // taskArgs.gelatoprovider = await run("handleGelatoProvider", {
      //   gelatoprovider: taskArgs.gelatoprovider
      // });
      // taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
      //   gelatoexecutor: taskArgs.gelatoexecutor
      // });

      const inputs = [taskArgs.gelatocoreaddress];

      if (taskArgs.log)
        console.log("\nScriptEnterPortfolioRebalancing Inputs:\n", taskArgs);

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnterPortfolioRebalancing",
        functionname: "enterPortfolioRebalancing",
        inputs
      });

      if (taskArgs.log)
        console.log("\nScriptEnterPortfolioRebalancing Payload:\n", payload);

      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
