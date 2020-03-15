import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask(
  "gc-mint:defaultpayload:ActionChainedTimedERC20TransferFrom",
  `Returns a hardcoded actionPayload of ActionChainedTimedERC20TransferFrom`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
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
      const gelatoProvider = await run("handleGelatoProvider");
      const gelatoExecutor = await run("handleGelatoExecutor");
      const conditionTimestampPassed = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTimestampPassed"
      });
      const actionChainedTimedERC20TransferFrom = await run("bre-config", {
        deployments: true,
        contractname: "ActionChainedTimedERC20TransferFrom"
      });
      const conditionTimestampPassedPayload = await run("handleGelatoPayload", {
        contractname: "ConditionTimestampPassed"
      });
      const timeOffset = 300; // 5 minutes

      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        [user, userProxy],
        [sendToken, destination],
        sendAmount,
        [gelatoProvider, gelatoExecutor],
        [conditionTimestampPassed, actionChainedTimedERC20TransferFrom],
        conditionTimestampPassedPayload,
        timeOffset
      ];
      // Encoding
      const actionChainedTimedERC20TransferFromPayload = await run(
        "abi-encode-withselector",
        {
          contractname: "ActionChainedTimedERC20TransferFrom",
          functionname: "action",
          inputs,
          log
        }
      );

      return actionChainedTimedERC20TransferFromPayload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
