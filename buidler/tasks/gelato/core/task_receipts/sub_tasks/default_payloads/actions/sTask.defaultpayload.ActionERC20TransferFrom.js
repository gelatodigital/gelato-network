import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-submittask:defaultpayload:ActionERC20TransferFrom",
  `Returns a hardcoded actionData of ActionERC20TransferFrom`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      /*
        address user;
        address userProxy;
        address sendToken;
        address destination;
        uint256 sendAmount;
      */
      // ActionERC20TransferFrom Params
      const { user1: user, user2: destination } = await run("bre-config", {
        addressbookcategory: "EOA",
      });
      const { proxy1: userProxy } = await run("bre-config", {
        addressbookcategory: "userProxy",
      });
      const { DAI: sendToken } = await run("bre-config", {
        addressbookcategory: "erc20",
      });
      const sendAmount = utils.parseUnits("1", 18);

      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        {
          user,
          userProxy,
          sendToken,
          destination,
          sendAmount,
        },
      ];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs,
        log,
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
