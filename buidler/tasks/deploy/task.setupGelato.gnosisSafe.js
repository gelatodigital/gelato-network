import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("setupgelato-gnosissafeproxy")
  .addParam("condition")
  .addOptionalVariadicPositionalParam("actions")
  .addOptionalParam("mastercopy", "gnosis safe mastercopy")
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
        constructorargs: [gelatoCore.address, GAS_PRICE.toString()],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Condition
      const condition = await run("deploy", {
        contractname: taskArgs.condition,
        log: taskArgs.log,
      });

      // === GelatoCore setup ===
      const { 1: gelatoExecutor, 2: gelatoProvider } = await ethers.signers();
      const gelatoExecutorAddress = await gelatoExecutor.getAddress();
      const gelatoProviderAddress = await gelatoProvider.getAddress();

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

      const actionWithGasPriceCeil = new ActionsWithGasPriceCeil(
        actionAddresses,
        utils.parseUnits("20", "gwei")
      );

      // ProviderModule Gnosis Safe
      // 1. Get extcodehash of Gnosis Safe
      const safeAddress = await run("gc-determineCpkProxyAddress");
      let providerToRead = ethers.provider;
      const extcode = await providerToRead.getCode(safeAddress);
      const extcodehash = utils.solidityKeccak256(["bytes"], [extcode]);

      // 1. Get Mastercopy
      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy",
        });
      }

      const providerModuleGnosisSafeProxy = await run("deploy", {
        contractname: "ProviderModuleGnosisSafeProxy",
        constructorargs: [
          [extcodehash],
          [taskArgs.mastercopy],
          gelatoCore.address,
        ],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Whitelist gelatoCore as module
      await run("gsp-exectransaction", {
        gnosissafeproxyaddress: safeAddress,
        contractname: "ScriptGnosisSafeEnableGelatoCore",
        inputs: [gelatoCore.address],
        functionname: "enableGelatoCoreModule",
        operation: 1,
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

      if (taskArgs.log) {
        console.log(`
            GelatoCore: ${gelatoCore.address}\n
            GelatoGasPriceOracle: ${gelatoGasPriceOracle.address}\n
            Condition: ${condition.address}\n
            ProviderModuleGnosisSafeProxy: ${providerModuleGnosisSafeProxy.address}\n
            extcodehash: ${extcodehash}\n
            Safe Address: ${safeAddress}\n
            mastercopy: ${taskArgs.mastercopy}\n
        `);
        actionAddresses.forEach((action) => {
          console.log(`Action: ${action}`);
        });
        console.log(``);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
