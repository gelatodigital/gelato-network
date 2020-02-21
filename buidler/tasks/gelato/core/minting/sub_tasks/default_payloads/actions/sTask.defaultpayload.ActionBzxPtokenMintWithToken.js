import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionBzxPtokenMintWithToken",
  `Returns a hardcoded executionPayload of ActionBzxPtokenMintWithToken`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ActionBzxPtokenMintWithToken";
      const functionname = "action";
      // Params
      const { luis: user } = await run("bre-config", {
        addressbookcategory: "EOA"
      });
      const { luis: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const { KNC: depositTokenAddress, dsETH2x: pTokenAddress } = await run(
        "bre-config",
        {
          addressbookcategory: "erc20"
        }
      );
      const depositAmt = utils.parseUnits("10", 18);

      // Params as sorted array of inputs for abi.encoding
      // action(_user, _userProxy, _depositTokenAddress, _depositAmount, _pTokenAddress)
      const inputs = [
        user,
        userProxy,
        depositTokenAddress,
        depositAmt,
        pTokenAddress
      ];
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
