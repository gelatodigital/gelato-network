import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gt-value",
  `Calls <trigername>.value(<triggerpayloadwithselector>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addOptionalPositionalParam("triggerpayloadwithselector", "abi.encoded bytes")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ triggername, triggerpayloadwithselector, log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

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
        contractname: triggername,
        read: true
      });
      // mintExecutionClaim TX (payable)
      const value = await triggerContract.getTriggerValue(
        src,
        srcamt,
        dest,
        refRate,
        greaterElseSmaller
      );

      if (log) {
        console.log(
          `\nTrigger: ${triggername}\
             \nTriggerPayloadWithSelector: ${triggerpayloadwithselector}\
             \nValue: ${value}\n`
        );
      }
      return value;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
