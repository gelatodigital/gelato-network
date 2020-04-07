import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

const GELATO_GAS_PRICE = utils.parseUnits("9", "gwei");

export default task(
  "setupgelato-gelatouserproxies",
  `Deploys GelatoCore, GelatoGasPriceOracle, ProviderModuleGelatoUserProxy, GelatoUserProxy,
    --action and --conditiod, and performs minimum viable setup`
)
  .addOptionalParam(
    "gelatogasprice",
    "The initial gelatoGasPrice to set on GelatoGasPriceOracle",
    GELATO_GAS_PRICE.toString()
  )
  .addOptionalParam(
    "condition",
    "A condition contract to deploy and batchProvide on ProviderModuleGelatoUserProxy"
  )
  .addOptionalParam(
    "action",
    "An Action contract to deploy and batchProvide on ProviderModuleGelatoUserProxy"
  )
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Log taskArgs and tx hashes inter alia")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // GelatoGasPriceOracle
      const { address: gelatoGasPriceOracleAddress } = await run("deploy", {
        contractname: "GelatoGasPriceOracle",
        constructorargs: [gelatoCore.address, taskArgs.gelatogasprice],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // GelatoUserProxy Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
        log: taskArgs.log,
      });

      // ProviderModule GelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const { address: providerModuleGelatoUserProxyAddress } = await run(
        "deploy",
        {
          contractname: "ProviderModuleGelatoUserProxy",
          constructorargs: [[extcodehash]],
          events: taskArgs.events,
          log: taskArgs.log,
        }
      );

      // Optional Condition
      let conditionAddress;
      if (taskArgs.condition) {
        const { address } = await run("deploy", {
          contractname: taskArgs.condition,
          log: taskArgs.log,
        });
        conditionAddress = address;
      }

      // Optional Action
      let actionAddress, actionWithGasPriceCeil;
      if (taskArgs.action) {
        const { address } = await run("deploy", {
          contractname: taskArgs.action,
          log: taskArgs.log,
        });
        actionAddress = address;
        actionWithGasPriceCeil = new ActionWithGasPriceCeil(
          actionAddress,
          utils.parseUnits("20", "gwei")
        );
      }

      // === GelatoCore setup ===
      // GelatoSysAdmin
      await run("gc-setgelatogaspriceoracle", {
        gelatocoreaddress: gelatoCore.address,
        oracle: gelatoGasPriceOracleAddress,
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
      const {
        1: { _address: gelatoExecutor },
      } = await ethers.getSigners();

      await run("gc-batchprovide", {
        gelatocoreaddress: gelatoCore.address,
        providerindex: 2,
        funds: "0.2",
        gelatoexecutor: gelatoExecutor,
        conditions: conditionAddress,
        actionswithgaspriceceil: actionWithGasPriceCeil,
        modules: [providerModuleGelatoUserProxyAddress],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      // === GelatoUserProxy setup ===
      await run("gupf-creategelatouserproxy", {
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
