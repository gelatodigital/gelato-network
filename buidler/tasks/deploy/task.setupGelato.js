import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("gc-setupgelato")
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

      // GelatoGasPriceOracle
      const gelatoGasPriceOracle = await run("deploy", {
        contractname: "GelatoGasPriceOracle",
        constructorargs: [gelatoCore.address, GAS_PRICE.toString()],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // === GelatoCore setup ===
      const { 1: gelatoExecutor, 2: gelatoProvider } = await ethers.signers();
      const gelatoExecutorAddress = await gelatoExecutor.getAddress();

      // GelatoSysAdmin
      await run("gc-setgelatogaspriceoracle", {
        gelatocoreaddress: gelatoCore.address,
        oracle: gelatoGasPriceOracle.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorindex: 1,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      await run("gc-multiprovide", {
        gelatocoreaddress: gelatoCore.address,
        providerindex: 2,
        funds: "1",
        gelatoexecutor: gelatoExecutorAddress,
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      if (taskArgs.log) {
        console.log(`
            GelatoCore: ${gelatoCore.address}\n
            GelatoGasPriceOracle: ${gelatoGasPriceOracle.address}\n
        `);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
