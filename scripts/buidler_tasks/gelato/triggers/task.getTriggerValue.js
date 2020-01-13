import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { utils } from "ethers";
import sleep from "../../../helpers/async/sleep";

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

      // Handle trigger payloadsWithSelector
      let triggerPayloadWithSelector;
      if (!triggerpayloadwithselector) {
        triggerPayloadWithSelector = await run(
          `gc-mint:defaultpayload:${triggername}`
        );
      } else {
        triggerPayloadWithSelector = triggerpayloadwithselector;
      }

      const triggerABI = await run("abi-get", { contractname: triggername });

      let firedFunction;
      for (const fn of triggerABI) {
        if (fn.name == "getTriggerValue") firedFunction = fn;
      }
      const abiCoder = utils.defaultAbiCoder;
      const decodedTriggerPayload = abiCoder.decode(
        firedFunction.inputs,
        triggerPayloadWithSelector
      );

      const account = await run("bre-config", {
        addressbookcategory: "EOA",
        addressbookentry: "luis"
      });
      const coin = "0xad6d458402f60fd3bd25163575031acdce07538d"; // ETH
      const refBalance = "0";

      // Trigger Read Instance
      const triggerContract = await run("instantiateContract", {
        contractname: triggername,
        read: true
      });
      // mintExecutionClaim TX (payable)
      const value = await triggerContract.getTriggerValue(
        account,
        coin,
        refBalance
      );

      if (log) {
        console.log(
          `\nTrigger: ${triggername}\
             \nTriggerPayloadWithSelector: ${triggerPayloadWithSelector}\
             \nValue: ${value}\n`
        );
      }
      return value;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
