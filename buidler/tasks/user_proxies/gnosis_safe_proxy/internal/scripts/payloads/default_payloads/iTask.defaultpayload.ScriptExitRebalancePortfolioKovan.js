import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptExitRebalancePortfolioKovan",
  `Returns a hardcoded payload for ScriptExitRebalancePortfolioKovan`
)
  .addVariadicPositionalParam(
    "inputs",
    "The ORDERED params for ScriptExitRebalancePortfolioKovan.exitRebalancingPortfolio"
  )
  .addOptionalParam(
    "recipient",
    "Address of recipient of fund withdrawal - defaults to Signer account 0."
  )
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      const executionClaim = await run("fetchExecutionClaim", {
        executionclaimid: taskArgs.inputs[0]
      });

      if (!taskArgs.recipient) {
        taskArgs.recipient = await run("ethers", {
          signer: true,
          address: true
        });
      }

      // console.log(`
      //   \n Withdraw Address: ${taskArgs.recipient}\n
      //   \n ProviderExecutor: ${executionClaim.selectedProviderAndExecutor}\n
      //   \n ExecutionClaimId: ${executionClaim.executionClaimId}\n
      //   \n ConditionAction: ${executionClaim.conditionAndAction}\n
      //   \n Condition Payload: ${executionClaim.conditionData}\n
      //   \n Actin Payload: ${executionClaim.actionData}\n
      //   \n Expiry Date: ${executionClaim.executionClaimExpiryDate}\n
      // `);

      const inputs = [
        taskArgs.recipient,
        executionClaim.selectedProviderAndExecutor,
        executionClaim.executionClaimId,
        executionClaim.conditionAndAction,
        executionClaim.conditionData,
        executionClaim.actionData,
        executionClaim.executionClaimExpiryDate
      ];

      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname: "ScriptExitRebalancePortfolioKovan",
        functionname: "exitRebalancingPortfolio",
        inputs,
        log: taskArgs.log
      });

      if (taskArgs.log) console.log(payloadWithSelector);

      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
