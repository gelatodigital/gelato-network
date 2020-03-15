import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-getmintingdepositpayable",
  `Return GelatoCore.getMintingDepositPayable() on [--network] (default: ${defaultNetwork})`
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

      // Handle selected executor default
      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      // Read Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      // Contract Call
      const mintingDepositPayable = await gelatoCore.getMintingDepositPayable(
        taskArgs.gelatoexecutor,
        conditionAddress,
        actionAddress
      );

      if (taskArgs.log) {
        const mintingDepositPayableETH = utils.formatUnits(
          mintingDepositPayable,
          "ether"
        );
        console.log(
          `\nCondition-Action-Combo: ${taskArgs.conditionname}-${taskArgs.actionname}`
        );
        console.log(
          `MintingDepositPayable:        ${mintingDepositPayableETH} ETH`
        );
        const ethUSDPrice = await run("eth", { usd: true });
        console.log(
          `MintingDepositPayable in USD: ${(
            ethUSDPrice * parseFloat(mintingDepositPayableETH)
          ).toFixed(2)}$`
        );
        await run("gc-executorprice", {
          gelatoexecutor: taskArgs.gelatoexecutor,
          log: taskArgs.log
        });
      }

      return mintingDepositPayable;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
