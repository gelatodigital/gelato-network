import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("gc-setupgelato")
  .addOptionalParam("providefunds", "providerFunds to supply in ETH")
  .addOptionalParam("gelatoexecutor", "the gelatoExecutor to assign")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      taskArgs.log = true;

      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);

      // === Deployments ===
      // GelatoCore

      // const gelatoCoreConstructorArgs = [
      //   7000000, // gelatoMaxGas // 7 mio initial
      //   100000, // internalGasRequirement
      //   1000000000000000000, // minExecutorStake // production: 1 ETH
      //   50, // executorSuccessShare // 50% of successful execution cost
      //   20, // sysAdminSuccessShare, // 20% of successful execution cost
      //   70, // totalSuccessShare
      // ];

      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // === GelatoCore setup ===
      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      await run("gc-multiprovide", {
        gelatocoreaddress: gelatoCore.address,
        funds: taskArgs.providefunds,
        gelatoexecutor: taskArgs.executor,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      if (taskArgs.log) {
        console.log(`
            GelatoCore: ${gelatoCore.address}\n
            GelatoGasPriceOracle: ${await gelatoCore.gelatoGasPriceOracle()}\n
        `);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
