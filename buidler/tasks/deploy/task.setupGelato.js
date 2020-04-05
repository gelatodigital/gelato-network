import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task("setupgelato")
  .addParam("condition")
  .addParam("action")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      taskArgs.log = true;

      console.log(taskArgs);

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log,
      });
      // Condition
      const condition = await run("deploy", {
        contractname: taskArgs.condition,
        log,
      });
      // Action
      const action = await run("deploy", {
        contractname: taskArgs.action,
        log,
      });
      const actionWithGasPriceCeil = new actionWithGasPriceCeil(
        action.address,
        utils.parseUnits("20", "gwei")
      );

      // GelatoUserProxy Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
        log,
      });
      // ProviderModule GelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const providerModuleGelatoUserProxy = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [[extcodehash]],
        events,
        log,
      });

      // === GelatoCore setup ===
      const { 1: gelatoExecutor } = await ether.signers();

      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorindex: 1,
        events,
        log,
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
        events,
        log,
      });

      // === GelatoUserProxy setup ===
      const gelatoUserProxyAddress = await run("gupf-creategelatouserproxy", {
        factoryaddress: gelatoUserProxyFactory.address,
        funding: "0",
        events,
        log,
      });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
