import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gelato-core-getmintingdepositpayable",
  `Return GelatoCore.getMintingDepositPayable() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addOptionalPositionalParam("selectedexecutor", "address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      const triggerAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.triggername
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Handle selected executor default
      const selectedexecutor = await run("handleExecutor", {
        selectedexecutor: taskArgs.selectedexecutor
      });

      // Read Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });
      // Contract Call
      const mintingDepositPayable = await gelatoCoreContract.getMintingDepositPayable(
        selectedexecutor,
        triggerAddress,
        actionAddress
      );

      if (taskArgs.log) {
        const mintingDepositPayableETH = utils.formatUnits(
          mintingDepositPayable,
          "ether"
        );
        console.log(
          `\nTrigger-Action-Combo: ${taskArgs.triggername}-${taskArgs.actionname}`
        );
        console.log(
          `MintingDepositPayable:        ${mintingDepositPayableETH} ETH`
        );
        const ethUSDPrice = await run("eth-price", { log: taskArgs.log });
        console.log(
          `MintingDepositPayable in USD: ${(
            ethUSDPrice * parseFloat(mintingDepositPayableETH)
          ).toFixed(2)}$`
        );
        await run("gelato-core-executorprice", {
          executor: taskArgs.selectedexecutor,
          log: taskArgs.log
        });
      }

      return mintingDepositPayable;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
