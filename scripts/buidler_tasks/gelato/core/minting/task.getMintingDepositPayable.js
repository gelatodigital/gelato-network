import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-getmintingdepositpayable",
  `Call GelatoCore.getMintingDepositPayable() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("selectedexecutor", "address")
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // Read Instance of GelatoCore
      const { GelatoCore: gelatoCoreAdddress } = await run("bre-config", {
        deployments: true
      });
      const gelatoCoreABI = await run("abi-get", {
        contractname: "GelatoCore"
      });
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        gelatoCoreABI,
        ethers.provider
      );

      const triggerAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.triggername
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Contract Call
      const mintingDepositPayable = await gelatoCoreContract.getMintingDepositPayable(
        taskArgs.selectedexecutor,
        triggerAddress,
        actionAddress
      );

      if (log) {
        // Getting the current Ethereum price
        const executorPrice = await run("gelato-core-executorprice", {
          executor: taskArgs.selectedexecutor
        });
        const ethUSDPrice = await run("eth-price");
        console.log(
          `\n Trigger-Action-Combo: ${taskArgs.triggername}-${
            taskArgs.actionname
          }
            Minting Deposit Per Mint: ${utils.formatUnits(
              MINTING_DEPOSIT_PER_MINT,
              "ether"
            )} ETH \t\t${ethUSDPrice *
            parseFloat(utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether"))} $`
        );
      }

      return mintingDepositPayable;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
