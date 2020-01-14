import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";
import sleep from "../../../../../../../helpers/async/sleep";

export default internalTask(
  "gc-mint:defaultpayload:TriggerKyberRate",
  `Returns a hardcoded actionPayloadWithSelector of TriggerKyberRate`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "TriggerKyberRate";
      // action(_user, _userProxy, _src, _srcAmt, _dest, _minConversionRate)
      const functionname = "fired";
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

      // Params as sorted array of inputs for abi.encoding
      // action(_user, _userProxy, _src, _srcAmt, _dest)
      const inputs = [src, srcamt, dest, refRate, greaterElseSmaller];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname,
        functionname,
        inputs,
        log
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
