import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gelato-core-mint:defaultpayload:ActionMultiMintForTriggerTimestampPassed",
  `Returns a hardcoded actionPayloadWithSelector of ActionMultiMintForTriggerTimestampPassed`
)
  .addParam(
    "selectedexecutor",
    "CAUTION: selectedexecutor cannot be a safe default"
  )
  .addParam(
    "numberofmints",
    "CAUTION: number of mints cannot be a safe default"
  )
  .addFlag("log")
  .setAction(async ({ selectedexecutor, numberofmints, log }) => {
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
      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        gelatoCoreAddress,
        selectedexecutor,
        triggerTimestampPassedAddress,
        startTime,
        actionAddress,
        actionPayloadWithSelector,
        intervalSpan,
        numberofmints
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
