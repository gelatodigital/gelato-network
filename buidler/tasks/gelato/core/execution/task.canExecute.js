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
	.addOptionalParam(
		"executionclaim",
		"Supply LogExecutionClaimMinted values in an obj"
	)
	.addOptionalParam(
		"fromblock",
		"The block number to search for event logs from",
		undefined, // default
		types.number
	)
	.addOptionalParam(
		"toblock",
		"The block number up until which to look for",
		undefined, // default
		types.number
	)
	.addOptionalParam("blockhash", "Search a specific block")
	.addOptionalParam("txhash", "Filter for a specific tx")
	.addFlag("log", "Logs return values to stdout")
	.setAction(
		async ({
			executionclaimid,
			executorindex,
			fromblock,
			toblock,
			blockhash,
			txhash,
			executionclaim,
			log
		}) => {
			try {
				if (!executionclaim) {
					// Fetch Execution Claim from LogExecutionClaimMinted values
					executionclaim = await run("gc-fetchparsedexecutionclaimevent", {
						executionclaimid,
						contractname: "GelatoCore",
						eventname: "LogExecutionClaimMinted",
						fromblock,
						toblock,
						blockhash,
						txhash,
						values: true,
						log
					});
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
						executionclaim.selectedProviderAndExecutor,
						executionclaim.executionClaimId,
						executionclaim.userProxy,
						executionclaim.conditionAndAction,
						executionclaim.conditionPayload,
						executionclaim.actionPayload,
						executionclaim.executionClaimExpiryDate
					);
					if (log) console.log(`\n Can Execute Result: ${canExecuteResult}`);
					return canExecuteResult;
				} catch (error) {
					console.error(`\n canExecute error`, error);
				}
			} catch (error) {
				console.error(error);
				process.exit(1);
			}
		}
	);
