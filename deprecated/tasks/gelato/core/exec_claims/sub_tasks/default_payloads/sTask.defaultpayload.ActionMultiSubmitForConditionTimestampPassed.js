import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gc-submittask:defaultpayload:ActionMultiSubmitForConditionTimestampPassed",
  `Returns a hardcoded actionData of ActionMultiSubmitForConditionTimestampPassed`
)
  .addParam(
    "gelatoexecutor",
    "CAUTION: gelatoexecutor cannot be a safe default"
  )
  .addParam(
    "numberofsubmissions",
    "CAUTION: number of creates cannot be a safe default"
  )
  .addFlag("log")
  .setAction(async ({ gelatoexecutor, numberofsubmissions, log }) => {
    try {
      const contractname = "ActionMultiSubmitForConditionTimestampPassed";
      // action(_gelatoCore, _gelatoExecutor, _conditionTimestampPassed, _startTime, _action, _actionData, _intervalSpan, _numberOfCreates)
      const functionname = "action";
      // Params
      const {
        GelatoCore: gelatoCoreAddress,
        ConditionTimestampPassed: conditionTimestampPassedAddress,
      } = await run("bre-config", {
        deployments: true,
      });
      const startTime = Math.floor(Date.now() / 1000);
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionKyberTrade",
      });
      const actionData = await run(
        "gc-submittask:defaultpayload:ActionKyberTrade",
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
        actionData,
        intervalSpan,
        numberofsubmissions,
      ];
      // Encoding
      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname,
        functionname,
        inputs,
        log,
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
