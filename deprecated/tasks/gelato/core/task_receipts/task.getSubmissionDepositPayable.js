import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-getsubmissiondepositpayable",
  `Return GelatoCore.getSubmissionDepositPayable() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addOptionalPositionalParam("gelatoexecutor", "address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.conditionname
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Handle selected gelatoExecutor default
      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      // Read Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      // Contract Call
      const submissionDepositPayable = await gelatoCore.getSubmissionDepositPayable(
        taskArgs.gelatoexecutor,
        conditionAddress,
        actionAddress
      );

      if (taskArgs.log) {
        const submissionDepositPayableETH = utils.formatUnits(
          submissionDepositPayable,
          "ether"
        );
        console.log(
          `\nCondition-Action-Combo: ${taskArgs.conditionname}-${taskArgs.actionname}`
        );
        console.log(
          `SubmissionDepositPayable:        ${submissionDepositPayableETH} ETH`
        );
        const ethUSDPrice = await run("eth", { usd: true });
        console.log(
          `SubmissionDepositPayable in USD: ${(
            ethUSDPrice * parseFloat(submissionDepositPayableETH)
          ).toFixed(2)}$`
        );
        await run("gc-executorprice", {
          gelatoexecutor: taskArgs.gelatoexecutor,
          log: taskArgs.log
        });
      }

      return submissionDepositPayable;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
