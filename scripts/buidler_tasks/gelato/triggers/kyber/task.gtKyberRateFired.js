import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gt-kyberrate-fired",
  `Calls <trigername>.fired(<triggerpayloadwithselector>) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // Handle trigger payloadsWithSelector
      // Params
      const { DAI: src, KNC: dest } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const srcamt = utils.parseUnits("10", 18);
      const [expectedRate] = await run("gt-kyber-getexpectedrate", {
        src,
        dest,
        srcamt
      });
      const refRate = utils
        .bigNumberify(expectedRate)
        .add(utils.parseUnits("1", 17));
      const greaterElseSmaller = false;

      // Trigger Read Instance
      const triggerContract = await run("instantiateContract", {
        contractname: "TriggerKyberRate",
        read: true
      });
      // mintExecutionClaim TX (payable)
      const fired = await triggerContract.fired(
        src,
        srcamt,
        dest,
        refRate,
        greaterElseSmaller
      );

      if (log)
        console.log(
          `\nTrigger: TriggerKyberRate\
           \nFired?: ${fired}\n`
        );
      return fired;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
