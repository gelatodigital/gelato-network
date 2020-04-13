import { task } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

const GELATO_GAS_PRICE = utils.parseUnits("9", "gwei");

export default task(
  "setupgelato-gelatouserproxies",
  `Deploys GelatoCore, GelatoGasPriceOracle, ProviderModuleGelatoUserProxy, GelatoUserProxy,
    --action and --conditiod, and performs minimum viable setup`
)
  .addOptionalVariadicPositionalParam("actionnames")
  .addOptionalParam(
    "gelatogasprice",
    "The initial gelatoGasPrice to set on GelatoGasPriceOracle",
    GELATO_GAS_PRICE.toString()
  )
  .addOptionalParam(
    "conditionname",
    "A condition contract to deploy and batchProvide on ProviderModuleGelatoUserProxy"
  )
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Log taskArgs and tx hashes inter alia")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);
      if (!taskArgs.gelatogasprice)
        taskArgs.gelatogasprice = GELATO_GAS_PRICE.toString();

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // GelatoGasPriceOracle
      const gelatoGasPriceOracle = await run("deploy", {
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
      const providerModuleGelatoUserProxy = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [[extcodehash]],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Optional Condition
      let conditionAddress;
      if (taskArgs.conditionname) {
        const { address } = await run("deploy", {
          contractname: taskArgs.conditionname,
          log: taskArgs.log,
        });
        conditionAddress = address;
      }

      // Action
      let actionAddresses = [];
      let tempArray = [];
      for (const action of taskArgs.actions) {
        if (!tempArray.includes(action)) {
          let actionconstructorargs;
          if (action === "ActionWithdrawBatchExchange") {
            const batchExchange = await run("bre-config", {
              addressbookcategory: "gnosisProtocol",
              addressbookentry: "batchExchange",
            });

            const { WETH: weth } = await run("bre-config", {
              addressbookcategory: "erc20",
            });

            // address _batchExchange, address _weth, address _gelatoProvider
            actionconstructorargs = [
              batchExchange,
              weth,
              gelatoProviderAddress,
            ];
          }
          const deployedAction = await run("deploy", {
            contractname: action,
            log: taskArgs.log,
            constructorargs: actionconstructorargs,
          });

          tempArray.push(action);
          actionAddresses.push(deployedAction.address);
        } else {
          let i = 0;
          for (const tempAction of taskArgs.actions) {
            if (tempAction === action) {
              actionAddresses.push(actionAddresses[i]);
              tempArray.push(action);
              break;
            }
            i = i + 1;
          }
        }
      }

      const actionsWithGasPriceCeil = new ActionsWithGasPriceCeil(
        actionAddresses,
        utils.parseUnits("20", "gwei")
      );

      // === GelatoCore setup ===
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
      const [_, executor] = await ethers.getSigners();
      const gelatoExecutorAddress = await executor.getAddress();

      await run("gc-batchprovide", {
        gelatocoreaddress: gelatoCore.address,
        providerindex: 2,
        funds: "0.2",
        gelatoexecutor: gelatoExecutorAddress,
        conditions: conditionAddress,
        actionswithgaspriceceil: actionsWithGasPriceCeil,
        modules: [providerModuleGelatoUserProxy.address],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      // === GelatoUserProxy setup ===
      await run("gupf-creategelatouserproxy", {
        factoryaddress: gelatoUserProxyFactory.address,
        funding: "0",
        // events: taskArgs.events,
        log: taskArgs.log,
      });

      return {
        gelatoCore,
        gelatoUserProxyFactory,
        providerModuleGelatoUserProxy,
        actionsWithGasPriceCeil,
        conditionAddress,
      };
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
