import { task } from '@nomiclabs/buidler/config';
import { defaultNetwork } from '../../../../../buidler.config';
// import { Contract } from 'ethers';

export default task(
	'gc-feargreedindex-reached',
	`Sends tx to ConditionFearGreedIndex.reached(<oldFearAndGreedIndex>) on [--network] (default: ${defaultNetwork})`
)
	.addPositionalParam('oldfearandgreedindex', 'is the condition activated')
	.addFlag('log', 'Logs return values to stdout')
	.setAction(async ({ oldfearandgreedindex, log }) => {
		try {
			const fearGreedContract = await run('instantiateContract', {
				contractname: 'ConditionFearGreedIndex',
				// contractaddress: actionAddress,
				write: true
			});
			// await contract.decodePayload(taskArgs[0]);
			const trueOrFalse = await fearGreedContract.reached(
				oldfearandgreedindex
			);
			if (log)
				console.log(
					`\n\nfear and greed condition is reached: ${trueOrFalse}`
				);
			return trueOrFalse;
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
