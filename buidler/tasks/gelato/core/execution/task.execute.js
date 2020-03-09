import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

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
			const [isExecutable, executionClaim, gelatoCore] = await run(
				"gc-canexecute",
				{
					executionclaimid,
					executorindex
				}
			);

			if (isExecutable) {
				try {
					const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
					const gelatoMAXGAS = await gelatoCore.MAXGAS();
					if (log)
						console.log(`
						\nGelato Gas Price: ${gelatoGasPrice}
						Gelato MAX GAS: ${gelatoMAXGAS}\n
						\nUser Proxy Address: ${executionClaim.userProxy}

					`);
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

					const executeTxReceipt = await tx.wait();
					if (log)
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
