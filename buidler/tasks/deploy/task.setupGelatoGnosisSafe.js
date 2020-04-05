import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("setupgelatognosissafe")
  .addParam("condition")
  .addParam("action")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      taskArgs.log = true;

      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // GelatoGasPriceOracle
      const gelatoGasPriceOracle = await run("deploy", {
        contractname: "GelatoGasPriceOracle",
        constructorargs: [gelatoCore.address, GAS_PRICE],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Condition
      const condition = await run("deploy", {
        contractname: taskArgs.condition,
        log: taskArgs.log,
      });
      // Action
      const action = await run("deploy", {
        contractname: taskArgs.action,
        log: taskArgs.log,
      });
      const actionWithGasPriceCeil = new ActionWithGasPriceCeil(
        action.address,
        utils.parseUnits("20", "gwei")
      );

      // === GelatoCore setup ===
      const signers = await ethers.signers();
      const gelatoExecutor = signers[1];
      const gelatoExecutorAddress = gelatoExecutor._address;

      // ProviderModule Gnosis Safe
      // 1. Get extcodehash of Gnosis Safe
      const safeAddress = await run("gc-determineCpkProxyAddress");
      console.log(`Safe Address: ${safeAddress}`);
      let provider = ethers.provider;
      const extcode = await provider.getCode(safeAddress);
      const extcodehash = utils.solidityKeccak256(["bytes"], [extcode]);
      console.log(`extcodehash: ${extcodehash}`);

      // 1. Get Mastercopy
      const mastercopy = await run("bre-config", {
        addressbookcategory: "gnosisSafe",
        addressbookentry: "mastercopy",
      });

      console.log(`mastercopy: ${mastercopy}`);

      const providerModuleGnosisSafeProxy = await run("deploy", {
        contractname: "ProviderModuleGnosisSafeProxy",
        constructorargs: [[extcodehash], [mastercopy]],
        events: taskArgs.events,
        log: taskArgs.log,
      });

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

      // Provider
      await run("gc-batchprovide", {
        gelatocoreaddress: gelatoCore.address,
        providerindex: 2,
        funds: "0.2",
        gelatoexecutor: gelatoExecutorAddress,
        conditions: [condition.address],
        actionswithgaspriceceil: [actionWithGasPriceCeil],
        modules: [providerModuleGnosisSafeProxy.address],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      console.log(`
        GelatoCore: ${gelatoCore.address}\n
        GelatoGasPriceOracle: ${gelatoGasPriceOracle.address}\n
        Condition: ${condition.address}\n
        Action: ${action.address}\n
        ProviderModuleGnosisSafeProxy: ${providerModuleGnosisSafeProxy.address}\n
      `);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
