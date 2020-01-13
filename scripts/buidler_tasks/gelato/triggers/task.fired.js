import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { utils } from "ethers";
import sleep from "../../../helpers/async/sleep";

export default task(
  "gelato-trigger-fired",
  `Calls <trigername>.fired(<triggerpayloadwithselector>) on [--network] (default: ${defaultNetwork})`
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
          `gelato-core-mint:defaultpayload:${triggername}`
        );
      } else {
        triggerPayloadWithSelector = triggerpayloadwithselector;
      }

      const triggerABI = await run("abi-get", { contractname: triggername });

      let firedFunction;
      for (const fn of triggerABI) {
        if (fn.name == "fired") firedFunction = fn;
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
      const coin = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH
      const refBalance = "1000000000000000000000000";

      // Trigger Read Instance
      const triggerContract = await run("instantiateContract", {
        contractname: triggername,
        read: true
      });
      // mintExecutionClaim TX (payable)
      const fired = await triggerContract.fired(account, coin, refBalance);

      if (log)
        console.log(
          `\nTrigger: ${triggername}\
           \nTriggerPayloadWithSelector: ${triggerPayloadWithSelector}\
           \nFired?: ${fired}\n`
        );
      return fired;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
