import { internalTask, types } from "@nomiclabs/buidler/config";

export default internalTask("ethers-interface-parseLogs")
  .addParam("contractname")
  .addParam("eventlogs", "", undefined, types.json)
  .setAction(async ({ contractname, eventlogs }) => {
    try {
      const contractInterface = await run("ethers-interface-new", {
        contractname,
      });
      if (Array.isArray(eventlogs)) {
        const parsedLogsWithTxHash = eventlogs.map((log) => {
          const parsedLog = contractInterface.parseLog(log);
          const parsedLogWithTxHash = {
            ...parsedLog,
            transactionHash: log.transactionHash,
          };
          return parsedLogWithTxHash;
        });
        return parsedLogsWithTxHash;
      } else {
        const parsedLog = contractInterface.parseLog(eventlogs);
        const parsedLogWithTxHash = {
          ...parsedLog,
          transactionHash: eventlogs.transactionHash,
        };
        return parsedLogWithTxHash;
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
