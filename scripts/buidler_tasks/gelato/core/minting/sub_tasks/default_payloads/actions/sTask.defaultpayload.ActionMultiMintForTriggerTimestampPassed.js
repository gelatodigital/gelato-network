import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gelato-core-mint:defaultpayload:ActionMultiMintForTriggerTimestampPassed",
  `Returns a hardcoded actionPayloadWithSelector of ActionMultiMintForTriggerTimestampPassed`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const contractname = "ActionMultiMintForTriggerTimestampPassed";
      // action(_gelatoCore, _selectedExecutor, _triggerTimestampPassed, _startTime, _action, _actionPayloadWithSelector, _intervalSpan, _numberOfMints)
      const functionname = "action";
      // Params
      const {
        GelatoCore: gelatoCoreAddress,
        TriggerTimestampPassed: triggerTimestampPassedAddress
      } = await run("bre-config", {
        deployments: true
      });
      const { default: selectedExecutor } = await run("bre-config", {
        addressbookcategory: "executor"
      });
      const startTime = Math.floor(Date.now() / 1000);
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionKyberTrade"
      });
      const actionPayloadWithSelector = await run(
        "gelato-core-mint:defaultpayload:ActionKyberTrade",
        { log }
      );
      const intervalSpan = "300"; // seconds
      const numberOfMints = "2";
      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        gelatoCoreAddress,
        selectedExecutor,
        triggerTimestampPassedAddress,
        startTime,
        actionAddress,
        actionPayloadWithSelector,
        intervalSpan,
        numberOfMints
      ];
      // Encoding
      const payloadWithSelector = await run("abiEncodeWithSelector", {
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
