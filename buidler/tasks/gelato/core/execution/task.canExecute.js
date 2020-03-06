import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
	"gc-canexecute",
	`Calls GelatoCore.canExecute() on [--network] (default: ${defaultNetwork})`
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
			// To avoid mistakes default log to true
			log = true;

			/*

			event LogExecutionClaimMinted(
				address[2] selectedProviderAndExecutor,
				uint256 indexed executionClaimId,
				address indexed userProxy,
				address[2] conditionAndAction,
				bytes conditionPayload,
				bytes actionPayload,
				uint256 executionClaimExpiryDate
			);

			*/

			// Fetch current gelatoCore
			const mintedExecutionClaims = await run("event-getparsedlogs", {
				contractname: "GelatoCore",
				eventname: "LogExecutionClaimMinted",
				values: true
			});

			try {
				const executionClaim = mintedExecutionClaims.find(foundExecutionClaim =>
					ethers.utils
						.bigNumberify(executionclaimid)
						.eq(foundExecutionClaim.executionClaimId)
				);

				if (log) {
					console.log(`\n Claim Id: ${executionclaimid}`);
					// console.log(`\n Execution Claim: `, executionClaim);
				}

				const signers = await ethers.signers();
				const signer = signers[parseInt(executorindex)];
				const gelatoCore = await run("instantiateContract", {
					contractname: "GelatoCore",
					signer: signer,
					write: true
				});

				/*
				address[2] memory _selectedProviderAndExecutor,
				uint256 _executionClaimId,
				address _userProxy,
				address[2] memory _conditionAndAction,
				bytes memory _conditionPayload,
				bytes memory _actionPayload,
				uint256 _executionClaimExpiryDate
				*/

				try {
					console.log(`Executor: ${signer._address}\n`);
					// console.log(...executionClaim);
					const isExecutable = await gelatoCore.canExecute(
						executionClaim.selectedProviderAndExecutor,
						executionClaim.executionClaimId,
						executionClaim.userProxy,
						executionClaim.conditionAndAction,
						executionClaim.conditionPayload,
						executionClaim.actionPayload,
						executionClaim.executionClaimExpiryDate
					);
					console.log(`Can Excute Result: ${isExecutable}`);
				} catch (error) {
					console.log(`Can execute failed`);
					console.log(error);
				}
			} catch (error) {
				console.log(error);
				console.log(`No execution claim found with id: ${executionclaimid}`);
			}

			// return [canExecuteResult, reason];
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
