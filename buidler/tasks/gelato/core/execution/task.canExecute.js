import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexecute",
  `Calls GelatoCore.canExecute() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("executionclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "which mnemonic index should be selected for executor msg.sender (default index 1)",
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
      /*
	  event LogExecutionClaimMinted(
			address[2] selectedProviderAndExecutor,
			uint256 indexed executionClaimId,
			address indexed userProxy,
			address[2] conditionAndAction,
			bytes conditionPayload,
			bytes actionPayload,
			uint256 executionClaimExpiryDate
	  );*/

      // Fetch current gelatoCore
      const mintedExecutionClaims = await run("event-getparsedlogs", {
        contractname: "GelatoCore",
        eventname: "LogExecutionClaimMinted",
        fromblock,
        values: true
      });

      const executionClaim = mintedExecutionClaims.find(mintedClaim =>
        ethers.utils
          .bigNumberify(executionclaimid)
          .eq(mintedClaim.executionClaimId)
      );

      if (executionClaim) {
        if (log) {
          console.log(
            `\n Execution Claim ID-${executionclaimid}:\n`,
            executionClaim
          );
        }

        const { [executorindex]: executor } = await ethers.signers();

        if (log) console.log(`\n Executor: ${executor._address}\n`);

        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: executor,
          write: true
        });

        try {
          const canExecuteResult = await gelatoCore.canExecute(
            executionClaim.selectedProviderAndExecutor,
            executionClaim.executionClaimId,
            executionClaim.userProxy,
            executionClaim.conditionAndAction,
            executionClaim.conditionPayload,
            executionClaim.actionPayload,
            executionClaim.executionClaimExpiryDate
          );
          if (log) console.log(`\n Can Execute Result: ${canExecuteResult}`);
          return canExecuteResult;
        } catch (error) {
          console.error(`\n canExecute error`, error);
        }
      } else {
        if (log)
          console.log(`\n Execution Claim Id ${executionclaimid} not found\n`);
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
