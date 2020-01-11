import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gelato-core-mint:payload:ActionMultiMintForTriggerTimestampPassed",
  `Returns a hardcoded actionPayloadWithSelector of ActionMultiMintForTriggerTimestampPassed`
)
  .addParam("starttime", "When first --actionname execution should happen")
  .addParam("actionname", "Action for which to multimint")
  .addParam("actionpayloadwithselector", "Payload for --actionname")
  .addParam("intervalspan", "The time between action executions")
  .addParam(
    "numberofmints",
    "The number of times --actionname execution should happen"
  )
  .addFlag("log")
  .setAction(async taskArgs => {
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
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });
      // Params as sorted array of inputs for abi.encoding
      const inputs = [
        gelatoCoreAddress,
        selectedExecutor,
        triggerTimestampPassedAddress,
        taskArgs.startTime,
        actionAddress,
        taskArgs.actionpayloadwithselector,
        taskArgs.intervalspan,
        taskArgs.numberofmints
      ];
      // Encoding
      const payloadWithSelector = await run("abiEncodeWithSelector", {
        contractname,
        functionname,
        inputs,
        log: taskArgs.log
      });
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
