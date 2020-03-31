import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "g-cbalance-ok",
  `Calls <condition>.ok(<conditionPayload>) on [--network] (default: ${defaultNetwork})`
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

      // ConditionRead Instance
      const conditionContract = await run("instantiateContract", {
        contractname: "ConditionBalance",
        read: true
      });
      // mintExecClaim TX (payable)
      const ok = await conditionContract.ok(
        account,
        coin,
        refBalance,
        greaterElseSmaller
      );

      if (log)
        console.log(
          `\nCondition: ConditionBalance\
           \nReached?: ${ok}\n`
        );
      return ok;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
