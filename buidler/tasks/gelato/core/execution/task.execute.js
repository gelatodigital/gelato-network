import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-execute",
  `Calls GelatoCore.execute() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("executionclaimid")
  .addPositionalParam(
    "executorindex",
    "which mnemoric index should be selected for executor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalPositionalParam(
    "fromblock",
    "the block from which to search for executionclaimid data"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executionclaimid, executorindex, fromblock, log }) => {
    try {
      // Fetch Execution Claim from LogExecutionClaimMinted values
      const executionClaim = await run("gc-fetchexecutionclaim", {
        executionclaimid,
        fromblock,
        log
      });

      // canExecute
      const canExecuteResult = await run("gc-canexecute", {
        executionclaimid,
        executorindex,
        executionclaim: executionClaim,
        fromblock,
        log
      });

      if (canExecuteResult === "ok") {
        const { [executorindex]: executor } = await ethers.signers();
        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: executor,
          write: true
        });
        try {
          const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
          const gelatoGasPriceGwei = utils.formatUnits(gelatoGasPrice, "gwei");
          const gelatoMAXGAS = await gelatoCore.MAXGAS();
          if (log) {
            console.log(
              `\n Gelato Gas Price:  ${gelatoGasPriceGwei} gwei\
               \n Gelato MAX GAS:    ${gelatoMAXGAS}\
               \n UserProxy Address: ${executionClaim.userProxy}\n`
            );
          }
          const tx = await gelatoCore.execute(
            executionClaim.selectedProviderAndExecutor,
            executionClaim.executionClaimId,
            executionClaim.userProxy,
            executionClaim.conditionAndAction,
            executionClaim.conditionPayload,
            executionClaim.actionPayload,
            executionClaim.executionClaimExpiryDate,
            {
              gasPrice: gelatoGasPrice,
              gasLimit: gelatoMAXGAS
            }
          );

          if (log) console.log(`\ntxHash execTransaction: ${tx.hash}\n`);

          await tx.wait();

          if (log) {

          }
          console.log(`
						\nExecution Claim: ${executionclaimid} succesfully executed!

					`);
        } catch (error) {
          if (log) {
            console.log("Estimate Gas failed");
            console.log(error);
          }
        }
      } else {
        if (log)
          console.log(`
						\nClaim not executed

					`);
      }

      // return [canExecuteResult, reason];
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
