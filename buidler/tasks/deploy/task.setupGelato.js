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

      // Deploy Gelato Core
      const gelatoCore = await run("deploy-gc", {});

      // Deploy Provider Modules

      // Gnosis Safe
      const gnosisSafeProviderModule = await run(
        "gc-deploy-gnosis-safe-module",
        {}
      );

      // Gelato User Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
      });

      const gelatoUserProxyModule = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [gelatoUserProxyFactory.address],
      });

      // Executor Setup
      await run("gc-stakeexecutor", {});

      // Provider Setup
      await run("gelato-providefunds", {
        ethamount: ethers.utils.parseEther("1"),
      });

      await run("gelato-add-provider-module", {
        modulename: "GnosisSafe",
      });
      await run("gelato-add-provider-module", {
        modulename: "GelatoUserProxy",
      });

      // Deploy GlobalState contract
      const globalState = await run("deploy", {
        contractname: "GlobalState",
      });

      // Deploy ProviderStateSetterFactory
      const providerFeeRelayFactory = await run("deploy", {
        contractname: "ProviderFeeRelayFactory",
        signerindex: 2,
        constructorargs: [globalState.address],
      });

      // Deploy Actions
      const batchExchangeAddress = await run("bre-config", {
        addressbookcategory: "gnosisProtocol",
        addressbookentry: "batchExchange",
      });

      const actionPlaceOrderBatchExchange = await run("deploy", {
        contractname: "ActionPlaceOrderBatchExchange",
        constructorargs: [batchExchangeAddress, globalState.address],
      });

      const actionWithdrawBatchExchange = await run("deploy", {
        contractname: "ActionWithdrawBatchExchange",
        constructorargs: [batchExchangeAddress],
      });

      const actionERC20TransferFromGlobal = await run("deploy", {
        contractname: "ActionERC20TransferFromGlobal",
        constructorargs: [globalState.address],
      });

      // Deploy Conditions
      const conditionTimeStateful = await run("deploy", {
        contractname: "ConditionTimeStateful",
        constructorargs: [gelatoCore.address],
      });

      const conditionBalanceStateful = await run("deploy", {
        contractname: "ConditionBalanceStateful",
        constructorargs: [gelatoCore.address],
      });

      const kyberProxyAddress = await run("bre-config", {
        addressbookcategory: "kyber",
        addressbookentry: "proxy",
      });

      const conditionKyberRateStateful = await run("deploy", {
        contractname: "ConditionKyberRateStateful",
        constructorargs: [kyberProxyAddress, gelatoCore.address],
      });

      // Provide Task Spec for each action

      // SET FEE For each action

      // await run("gc-multiprovide", {
      //   gelatocoreaddress: gelatoCore.address,
      //   funds: taskArgs.providefunds,
      //   gelatoexecutor: taskArgs.executor,
      //   events: taskArgs.events,
      //   log: taskArgs.log,
      // });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
