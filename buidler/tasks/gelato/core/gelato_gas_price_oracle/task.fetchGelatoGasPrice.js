import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchGelatoGasPrice",
  `Returns the current gelato gas price used for calling canExec and exec`
)
  .addOptionalParam("gelatocoreaddress")
  .addOptionalParam("fromblock", "", undefined, types.int)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        read: true,
      });

      // Fetch gelato Gas price
      const gelatoGasPriceOracleAddress = await gelatoCore.gelatoGasPriceOracle();

      const logsSetGasPrice = await run("event-getlogs", {
        contractname: "GelatoGasPriceOracle",
        contractaddress: gelatoGasPriceOracleAddress,
        eventname: "LogGasPriceSet",
        fromblock: taskArgs.fromblock,
      });

      if (!logsSetGasPrice)
        throw new Error(`\n fetchGelatoGasPrice: no LogGasPriceSet \n`);
      const lastLog = logsSetGasPrice[logsSetGasPrice.length - 1];
      const parsedLastLog = await run("ethers-interface-parseLogs", {
        contractname: "GelatoGasPriceOracle",
        eventlogs: lastLog,
      });

      const gelatoGasPrice = parsedLastLog.parsedLog.values.newGasPrice;

      if (taskArgs.log) {
        console.log(
          `\ngelatoGasPrice: ${utils.formatUnits(
            gelatoGasPrice.toString(),
            "gwei"
          )} gwei\n`
        );
      }

      return gelatoGasPrice;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
