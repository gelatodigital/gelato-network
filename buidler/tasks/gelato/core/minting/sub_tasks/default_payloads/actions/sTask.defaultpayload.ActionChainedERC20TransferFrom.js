import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionChainedERC20TransferFrom",
  `Returns a hardcoded actionPayload of ActionChainedERC20TransferFrom`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ActionChainedERC20TransferFrom";
      const functionname = "action";

      // ActionERC20TransferFrom Params
      const { devluis: user, luis: destination } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      const { luis: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const { KNC: sendToken } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const sendAmount = utils.parseUnits("10", 18);

      // ActionChainedERC20TransferFrom additional Params
      const selectedProvider = await run("handleProvider");
      const selectedExecutor = await run("handleExecutor");

      const condition = await run("bre-config", {deployments:true, contractname: "ConditionTimestampPassed"})
      const { luis: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const { KNC: sendToken } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const sendAmount = utils.parseUnits("10", 18);

      // Params as sorted array of inputs for abi.encoding
      // action(_user, _userProxy, _src, _srcAmt, _beneficiary)
      const inputs = [[user, userProxy], [sendToken, destination], sendAmount];
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
