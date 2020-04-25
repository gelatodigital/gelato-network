import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchCurrentGasPrice",
  `Returns the current gelato gas price used for calling canExec and exec`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true,
      });
      // Fetch gelato Gas price
      const gelatoGasPriceOracleAddress = await gelatoCore.gelatoGasPriceOracle();

      const gelatoGasPriceOracleInterface = await run("ethers-interface-new", {
        contractname: "GelatoGasPriceOracle",
      });

      const filterLogGasPriceSet = {
        address: gelatoGasPriceOracleAddress,
        fromBlock: parseInt(network.config.block),
        topics: [gelatoGasPriceOracleInterface.events["LogGasPriceSet"].topic],
      };
      const logsSetGasPrice = await ethers.provider.getLogs(
        filterLogGasPriceSet
      );

      if (logsSetGasPrice.length == 0) return;
      const lastLog = logsSetGasPrice[logsSetGasPrice.length - 1];
      const parsedLastLog = gelatoGasPriceOracleInterface.parseLog(lastLog);
      const gelatoGasPrice = parsedLastLog.values.newGasPrice;
      // Fetch gelato Gas price END

      return gelatoGasPrice;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
