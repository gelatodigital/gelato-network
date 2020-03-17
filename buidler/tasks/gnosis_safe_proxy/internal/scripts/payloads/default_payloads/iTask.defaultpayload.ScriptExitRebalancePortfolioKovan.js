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
  // .addPositionalParam("proxy", "users gnosis safe proxy address")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {
      // Handle taskArgs defaults
      // if (!taskArgs.gelatocoreaddress) {
      //   taskArgs.gelatocoreaddress = await run("bre-config", {
      //     deployments: true,
      //     contractname: "GelatoCore"
      //   });
      // }
      // taskArgs.gelatoprovider = await run("handleGelatoProvider", {
      //   gelatoprovider: taskArgs.gelatoprovider
      // });
      // taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
      //   gelatoexecutor: taskArgs.gelatoexecutor
      // });

      // const inputs = [taskArgs.gelatocoreaddress];

      // if (taskArgs.log)
      //   console.log("\nScriptExitRebalancePortfolioKovan Inputs:\n", taskArgs);

      // const payload = await run("abi-encode-withselector", {
      //   contractname: "ScriptExitRebalancePortfolioKovan",
      //   functionname: "enterPortfolioRebalancing",
      //   inputs
      // });

      // if (taskArgs.log)
      //   console.log("\nScriptExitRebalancePortfolioKovan Payload:\n", payload);


      if(!taskArgs.inputs) {
        throw Error("Need to provde execution claim as input in execTransaction script")
      }

      const executionclaimid = taskArgs.inputs[0];
      const executionClaim = await run("fetchExecutionClaim", {
          executionclaimid: executionclaimid
        });


      /*
      address payable _withdrawAddress,
      address[2] calldata _selectedProviderAndExecutor,
      uint256 _executionClaimId,
      address[2] calldata ,
      bytes calldata _conditionPayload,
      bytes calldata _actionPayload,
      uint256 _executionClaimExpiryDate
      */

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

      // const gnosisSafeProxy = await run("instantiateContract", {
      //   contractname: "IGnosisSafe",
      //   contractaddress: taskArgs.proxy,
      //   write: true
      // });

      // const proxyOwners = await gnosisSafeProxy.getOwners();
      if (taskArgs.log) console.log(payloadWithSelector);

      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
