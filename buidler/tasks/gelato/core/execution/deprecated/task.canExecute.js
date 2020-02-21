import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract, utils } from "ethers";

export default task(
  "gc-canexecute",
  `Calls GelatoCore.canExecute() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("executionclaimid")
  .addPositionalParam(
    "fromblock",
    "the block from which to search for executionclaimid data"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executionclaimid, fromblock, log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      // Make sure executionclaimide is integer
      const queriedExecutionClaimId = parseInt(executionclaimid);

      const gelatoCoreContractABI = await run("abi-get", {
        contractname: "GelatoCore"
      });
      const { GelatoCore: gelatoCoreAddress } = await run("bre-config", {
        deployments: true
      });
      const iface = new utils.Interface(gelatoCoreContractABI);

      // LogExecutionClaimMinted - Store them in outstandingExecutionClaims
      const topicExecutionClaimMinted = utils.id(
        "LogExecutionClaimMinted(address,uint256,address,address,bytes,address,bytes,uint256[3],uint256,uint256)"
      );
      const filterExecutionClaimMinted = {
        address: gelatoCoreAddress,
        fromBlock: parseInt(fromblock),
        topics: [topicExecutionClaimMinted]
      };
      const logsExecutionClaimMinted = await ethers.provider.getLogs(
        filterExecutionClaimMinted
      );

      let queriedExecutionClaim;

      for (const log of logsExecutionClaimMinted) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parseInt(parsedLog.values.executionClaimId);
        // Filter out executionClaimIds that are irrelevant
        if (executionClaimId !== queriedExecutionClaimId) continue;
        else {
          queriedExecutionClaim = {
            selectedExecutor: parsedLog.values.selectedExecutor,
            executionClaimId,
            userProxy: parsedLog.values.userProxy,
            condition: parsedLog.values.condition,
            conditionPayload:
              parsedLog.values.conditionPayload,
            action: parsedLog.values.action,
            executionPayload:
              parsedLog.values.executionPayload,
            conditionGasActionTotalGasMinExecutionGas:
              parsedLog.values.conditionGasActionTotalGasMinExecutionGas,
            executionClaimExpiryDate: parsedLog.values.executionClaimExpiryDate,
            mintingDeposit: parsedLog.values.mintingDeposit
          };
        }
      }

      // Get ActionConditionsChecksGas for canExecute()
      const actionABI = [
        "function actionConditionsCheckGas() external pure returns(uint256)"
      ];
      const [signer] = await ethers.signers();
      const actionContract = new Contract(
        queriedExecutionClaim.action,
        actionABI,
        signer
      );
      const actionConditionsCheckGas = await actionContract.actionConditionsCheckGas();

      // GelatoCore read Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      // call to canExecute
      const [canExecuteResult, reason] = await gelatoCoreContract.canExecute(
        queriedExecutionClaim.executionClaimId,
        queriedExecutionClaim.userProxy,
        queriedExecutionClaim.condition,
        queriedExecutionClaim.conditionPayload,
        queriedExecutionClaim.action,
        queriedExecutionClaim.executionPayload,
        queriedExecutionClaim.conditionGasActionTotalGasMinExecutionGas,
        actionConditionsCheckGas,
        queriedExecutionClaim.executionClaimExpiryDate,
        queriedExecutionClaim.mintingDeposit
      );

      if (log) {
        const canExecuteResults = [
          "ExecutionClaimAlreadyExecutedOrCancelled",
          "ExecutionClaimNonExistant",
          "ExecutionClaimExpired",
          "WrongCalldata",
          "ConditionNotOk",
          "UnhandledConditionError",
          "ActionConditionsNotOk",
          "UnhandledActionConditionsError",
          "Executable"
        ];
        console.log(
          `\nCanExecuteResult: ${canExecuteResult}-${
            canExecuteResults[parseInt(canExecuteResult)]
          }`
        );
        const standardReasons = ["Ok", "NotOk", "UnhandledError"];
        console.log(`Reason: ${reason}-${standardReasons[parseInt(reason)]}`);
      }
      return [canExecuteResult, reason];
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
