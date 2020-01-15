import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gt-balance-fired",
  `Calls <trigername>.fired(<triggerpayloadwithselector>) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // Params
      const { luis: account } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      const { DAI: coin } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      /* const coin = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH */

      const refBalance = utils.parseUnits("24", 18);
      const greaterElseSmaller = true;

      // Trigger Read Instance
      const triggerContract = await run("instantiateContract", {
        contractname: "TriggerBalance",
        read: true
      });
      // mintExecutionClaim TX (payable)
      const fired = await triggerContract.fired(
        account,
        coin,
        refBalance,
        greaterElseSmaller
      );

      if (log)
        console.log(
          `\nTrigger: TriggerBalance\
           \nFired?: ${fired}\n`
        );
      return fired;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
