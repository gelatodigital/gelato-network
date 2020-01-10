import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask("abiEncodeWithSelector")
  .addParam("abi")
  .addOptionalVariadicPositionalParam("args")
  .addOptionalParam("log")
  .setAction(async ({ abi, args, log }) => {
    try {
      const iFace = new utils.Interface(
        actionMultiMintForTriggerTimestampPassedABI
      );

      const payloadWithSelector = iFace.functions.action.encode([
        gelatoCore,
        selectedExecutor,
        timeTrigger,
        startTime,
        action,
        actionPayloadWithSelector,
        intervalSpan,
        numberOfMints
      ]);

      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
