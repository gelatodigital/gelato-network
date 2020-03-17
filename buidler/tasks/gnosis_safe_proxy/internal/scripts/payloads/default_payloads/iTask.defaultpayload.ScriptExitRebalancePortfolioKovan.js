import { internalTask } from "@nomiclabs/buidler/config";
import { ethers } from "ethers";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptExitRebalancePortfolioKovan",
  `Returns a hardcoded payload for ScriptExitRebalancePortfolioKovan`
)
  .addOptionalVariadicPositionalParam(
    "inputs",
    "The parameters for the function call"
  )
  .addOptionalParam(
    "withdrawAddress",
    "where to withdraw the funds to"
    // Defaults to mnemonic 0
  )
  .addFlag("log")
  .setAction(async taskArgs => {
    try {


      if(!taskArgs.inputs) {
        throw Error("Need to provde execution claim as input in execTransaction script")
      }

      const executionclaimid = taskArgs.inputs[0];
      const executionClaim = await run("fetchExecutionClaim", {
          executionclaimid: executionclaimid
        });

      if (!taskArgs.withdrawAddress) {
        taskArgs.withdrawAddress = await run("ethers", {
          signer: true,
          address: true
        });
      }

      // console.log(`
      //   \n Withdraw Address: ${taskArgs.withdrawAddress}\n
      //   \n ProviderExecutor: ${executionClaim.selectedProviderAndExecutor}\n
      //   \n ExecutionClaimId: ${executionClaim.executionClaimId}\n
      //   \n ConditionAction: ${executionClaim.conditionAndAction}\n
      //   \n Condition Payload: ${executionClaim.conditionPayload}\n
      //   \n Actin Payload: ${executionClaim.actionPayload}\n
      //   \n Expiry Date: ${executionClaim.executionClaimExpiryDate}\n
      // `);

      const inputs = [
        taskArgs.withdrawAddress,
        executionClaim.selectedProviderAndExecutor,
        executionClaim.executionClaimId,
        executionClaim.conditionAndAction,
        executionClaim.conditionPayload,
        executionClaim.actionPayload,
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
