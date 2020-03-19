import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ConditionKyberRateKovan",
  `Returns a hardcoded execPayload of ConditionKyberRateKovan`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "kovan") throw new Error("wrong network!");

      const contractname = "ConditionKyberRateKovan";
      // action(_user, _userProxy, _src, _srcAmt, _dest, _minConversionRate)
      const functionname = "ok";
      // Params
      const { DAI: src, KNC: dest } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const srcamt = utils.parseUnits("10", 18);
      const [expectedRate] = await run("gc-kyber-getexpectedrate", {
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
