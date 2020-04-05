import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("setupgelato")
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
        constructorargs: [GAS_PRICE, gelatoCore.address],
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

      // GelatoUserProxy Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
        log: taskArgs.log,
      });
      // ProviderModule GelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const providerModuleGelatoUserProxy = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [[extcodehash]],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // === GelatoCore setup ===
      const {
        1: { _address: gelatoExecutor },
      } = await ethers.signers();

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
        gelatoexecutor: gelatoExecutor,
        conditions: [condition.address],
        actionswithgaspriceceil: [actionWithGasPriceCeil],
        modules: [providerModuleGelatoUserProxy.address],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      // === GelatoUserProxy setup ===
      const gelatoUserProxyAddress = await run("gupf-creategelatouserproxy", {
        factoryaddress: gelatoUserProxyFactory.address,
        funding: "0",
        events: taskArgs.events,
        log: taskArgs.log,
      });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
