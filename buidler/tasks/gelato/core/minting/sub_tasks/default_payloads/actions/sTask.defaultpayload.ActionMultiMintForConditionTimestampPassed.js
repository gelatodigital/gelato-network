import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-mint:defaultpayload:ActionMultiMintForConditionTimestampPassed",
  `Returns a hardcoded actionPayload of ActionMultiMintForConditionTimestampPassed`
)
  .addParam(
    "gelatoexecutor",
    "CAUTION: gelatoexecutor cannot be a safe default"
  )
  .addParam(
    "numberofmints",
    "CAUTION: number of mints cannot be a safe default"
  )
  .addFlag("log")
  .setAction(async ({ gelatoexecutor, numberofmints, log }) => {
    try {
      const contractname = "ActionMultiMintForConditionTimestampPassed";
      // action(_gelatoCore, _selectedExecutor, _conditionTimestampPassed, _startTime, _action, _actionPayload, _intervalSpan, _numberOfMints)
      const functionname = "action";
      // Params
      const {
        GelatoCore: gelatoCoreAddress,
        ConditionTimestampPassed: conditionTimestampPassedAddress
      } = await run("bre-config", {
        deployments: true
      });
      const startTime = Math.floor(Date.now() / 1000);
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionKyberTrade"
      });
      const actionPayload = await run(
        "gc-mint:defaultpayload:ActionKyberTrade",
        { log }
      );
      const intervalSpan = "300"; // seconds
      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        gelatoCoreAddress,
        gelatoexecutor,
        conditionTimestampPassedAddress,
        startTime,
        actionAddress,
        actionPayload,
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
