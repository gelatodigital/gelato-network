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
  .setAction(async (taskArgs) => {
    try {
      const taskReceipt = await run("fetchTaskReceipt", {
        taskreceiptid: taskArgs.inputs[0],
      });

      if (!taskArgs.recipient) {
        taskArgs.recipient = await run("ethers", {
          signer: true,
          address: true,
        });
      }

      // console.log(`
      //   \n Withdraw Address: ${taskArgs.recipient}\n
      //   \n ProviderExecutor: ${taskReceipt.selectedProviderAndExecutor}\n
      //   \n TaskReceiptId: ${taskReceipt.taskReceiptId}\n
      //   \n ConditionAction: ${taskReceipt.conditionAndAction}\n
      //   \n Condition Payload: ${taskReceipt.conditionData}\n
      //   \n Actin Payload: ${taskReceipt.actionData}\n
      //   \n Expiry Date: ${taskReceipt.taskReceiptExpiryDate}\n
      // `);

      const inputs = [
        taskArgs.recipient,
        taskReceipt.selectedProviderAndExecutor,
        taskReceipt.taskReceiptId,
        taskReceipt.conditionAndAction,
        taskReceipt.conditionData,
        taskReceipt.actionData,
        taskReceipt.taskReceiptExpiryDate,
      ];

      const payloadWithSelector = await run("abi-encode-withselector", {
        contractname: "ScriptExitRebalancePortfolioKovan",
        functionname: "exitRebalancingPortfolio",
        inputs,
        log: taskArgs.log,
      });

      if (taskArgs.log) console.log(payloadWithSelector);

      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
