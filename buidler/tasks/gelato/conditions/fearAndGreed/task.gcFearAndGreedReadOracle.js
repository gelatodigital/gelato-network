import { task } from '@nomiclabs/buidler/config';
import { defaultNetwork } from '../../../../../buidler.config';
// import { Contract } from 'ethers';

export default task(
	'gc-feargreedindex-readoracle',
	`Sends tx to ConditionFearGreedIndex.fearAndGreedIndex(<newOracleValue>) on [--network] (default: ${defaultNetwork})`
)
	.addFlag('log', 'Logs return values to stdout')
	.setAction(async ({ log }) => {
		try {
			const fearGreedContract = await run('instantiateContract', {
				contractname: 'ConditionFearGreedIndex',
				// contractaddress: actionAddress,
				read: true
			});
			// await contract.decodePayload(taskArgs[0]);
			const fearAndGreedIndexValue = await fearGreedContract.fearAndGreedIndex();
			if (log)
				console.log(
					`\n\nfear and greed index value: ${fearAndGreedIndexValue}`
				);
			return fearAndGreedIndexValue;
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	});
