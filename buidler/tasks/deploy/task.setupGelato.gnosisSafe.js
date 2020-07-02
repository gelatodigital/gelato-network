import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";
import TaskSpec from "../../../src/classes/gelato/TaskSpec";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("setupgelato-gnosissafeproxy")
  .addOptionalParam("condition")
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

      // Condition
      if (taskArgs.condition) {
        const conditionInstance = await run("deploy", {
          contractname: taskArgs.condition,
          log: taskArgs.log,
        });
        taskArgs.condition = conditionInstance.address;
      }

      // === GelatoCore setup ===
      const { 1: gelatoExecutor, 2: gelatoProvider } = await ethers.signers();
      const gelatoExecutorAddress = await gelatoExecutor.getAddress();
      const gelatoProviderAddress = await gelatoProvider.getAddress();

      // Action
      let actionAddresses = [];
      let tempArray = [];
      if (taskArgs.actions)
        for (const action of taskArgs.actions) {
          if (!tempArray.includes(action)) {
            let actionconstructorargs;
            if (action === "ActionWithdrawBatchExchange") {
              const batchExchangeAddress = await run("bre-config", {
                addressbookcategory: "gnosisProtocol",
                addressbookentry: "batchExchange",
              });

              const feeExtractorAddress = await run("bre-config", {
                contractname: "FeeExtractor",
                log: taskArgs.log,
                deployments: true,
              });

              // address _batchExchange, address _weth, address _gelatoProvider
              actionconstructorargs = [
                batchExchangeAddress,
                feeExtractorAddress,
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

      // addr, data, operation, value, termsOkCheck
      const actionArray = [];
      if (actionAddresses.length >= 1)
        for (const actionAddress of actionAddresses) {
          const action = new Action({
            addr: actionAddress,
            data: constants.HashZero,
            operation: Operation.Delegatecall,
            termsOkCheck: true,
          });
          actionArray.push(action);
        }

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
          addressbookentry: "mastercopy1_1_1",
        });
      }

      // get multisend contract
      const multiSendAddress = await run("bre-config", {
        addressbookcategory: "gnosisSafe",
        addressbookentry: "multiSend",
      });

      const providerModuleGnosisSafeProxy = await run("deploy", {
        contractname: "ProviderModuleGnosisSafeProxy",
        constructorargs: [
          [extcodehash],
          [taskArgs.mastercopy],
          gelatoCore.address,
          multiSendAddress,
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

      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Provider
      // Create TaskSpec condition, actions, gasPriceCeil
      const taskSpec = new TaskSpec({
        conditions: taskArgs.condition ? [taskArgs.condition] : undefined,
        actions: actionArray,
        gasPriceCeil: utils.parseUnits("20", "gwei"),
      });

      await run("gc-multiprovide", {
        gelatocoreaddress: gelatoCore.address,
        funds: "1",
        gelatoexecutor: gelatoExecutorAddress,
        taskSpecs: [taskSpec],
        modules: [providerModuleGnosisSafeProxy.address],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      if (taskArgs.log) {
        console.log(`
            GelatoCore: ${gelatoCore.address}\n
            GelatoGasPriceOracle: ${gelatoGasPriceOracle.address}\n
            Condition: ${taskArgs.condition}\n
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
