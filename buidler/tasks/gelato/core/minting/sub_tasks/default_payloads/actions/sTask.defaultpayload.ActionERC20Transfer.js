import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionERC20Transfer",
  `Returns a hardcoded execPayload of ActionERC20TransferFrom`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ActionERC20Transfer";
      // action(_user, _userProxy, _src, _srcAmt, _dest, _minConversionRate)
      const functionname = "action";
      // Params
      const { luis: user } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      const { luis: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const { DAI: src } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const srcAmt = utils.parseUnits("10", 18);

      const beneficiary = user;

      // Params as sorted array of inputs for abi.encoding
      // action(_user, _userProxy, _src, _srcAmt, _beneficiary)
      const inputs = [user, userProxy, src, srcAmt, beneficiary];
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
