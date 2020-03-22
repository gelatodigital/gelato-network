import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnterPortfolioRebalancingKovan",
  `Returns a hardcoded payload for ScriptEnterPortfolioRebalancingKovan`
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
      taskArgs.gelatoprovider = await run("handleGelatoProvider", { 
        gelatoprovider: taskArgs.gelatoprovider 
      })

      if( !taskArgs.gelatoprovider) {
        taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
          gelatoexecutor: taskArgs.gelatoexecutor
        });

      }

      const providerAndExecutor = [
        taskArgs.gelatoprovider,
        taskArgs.gelatoexecutor
      ]

      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: 'ConditionFearGreedIndex'
      });

      const actiomAddress = await run("bre-config", {
        deployments: true,
        contractname: 'ActionChainedRebalancePortfolioKovan'
      });

      const conditionAndAction = [
        conditionAddress,
        actiomAddress
      ]


      const inputs = [
        taskArgs.gelatocoreaddress,
        providerAndExecutor,
        conditionAndAction
      ];

      if (taskArgs.log)
        console.log(
          "\nScriptEnterPortfolioRebalancingKovan Inputs:\n",
          taskArgs
        );

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnterPortfolioRebalancingKovan",
        functionname: "enterPortfolioRebalancing",
        inputs
      });

      if (taskArgs.log)
        console.log(
          "\nScriptEnterPortfolioRebalancingKovan Payload:\n",
          payload
        );

      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
