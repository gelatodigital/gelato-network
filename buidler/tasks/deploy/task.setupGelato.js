import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task("gc-setupgelato")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      taskArgs.log = true;

      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);

      // Deploy Gelato Core
      const gelatoCore = await run("deploy-gc", {});

      const gelatoActionPipeline = await run("deploy", {
        contractname: "GelatoActionPipeline",
      });

      // Deploy Provider Modules
      // // Gnosis Safe
      const gnosisSafeProviderModule = await run(
        "gc-deploy-gnosis-safe-module",
        {
          gelatoactionpipeline: gelatoActionPipeline.address,
        }
      );

      // Gelato User Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
      });

      // // Gelato User Proxy
      const gelatoUserProxyModule = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [
          gelatoUserProxyFactory.address,
          gelatoActionPipeline.address,
        ],
      });

      // Executor Setup
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
      });

      // Provider Setup
      await run("gelato-providefunds", {
        ethamount: "1",
        gelatocoreaddress: gelatoCore.address,
      });

      await run("gelato-add-provider-module", {
        moduleaddress: gnosisSafeProviderModule.address,
      });
      await run("gelato-add-provider-module", {
        moduleaddress: gelatoUserProxyModule.address,
      });

      // Assign executor
      await run("gelato-assign-executor", {
        gelatocoreaddress: gelatoCore.address,
      });

      // Deploy Fee Handler Factory
      const feeHandlerFactory = await run("deploy", {
        contractname: "FeeHandlerFactory",
        signerindex: 2,
      });

      // Whitelist a couple of tokens
      const dai = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: "DAI",
      });

      await feeHandlerFactory.addTokenToWhitelist(dai);

      const weth = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: "WETH",
      });

      await feeHandlerFactory.addTokenToWhitelist(weth);

      const usdc = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: "USDC",
      });

      await feeHandlerFactory.addTokenToWhitelist(usdc);

      // Deploy Actions
      const batchExchangeAddress = await run("bre-config", {
        addressbookcategory: "gnosisProtocol",
        addressbookentry: "batchExchange",
      });

      const actionPlaceOrderBatchExchange = await run("deploy", {
        contractname: "ActionPlaceOrderBatchExchange",
        constructorargs: [batchExchangeAddress],
      });

      const actionWithdrawBatchExchange = await run("deploy", {
        contractname: "ActionWithdrawBatchExchange",
        constructorargs: [batchExchangeAddress],
      });

      const actionERC20TransferFrom = await run("deploy", {
        contractname: "ActionERC20TransferFrom",
      });

      const actionTransfer = await run("deploy", {
        contractname: "ActionTransfer",
      });

      const uniswapFactoryAddress = await run("bre-config", {
        addressbookcategory: "uniswap",
        addressbookentry: "uniswapFactory",
      });

      const actionUniswapTrade = await run("deploy", {
        contractname: "ActionUniswapTrade",
        constructorargs: [uniswapFactoryAddress],
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

      console.log(
        `
      \n GelatoCore: ${gelatoCore.address}
      \n GnosisSafeProviderModule: ${gnosisSafeProviderModule.address}
      \n GelatoUserProxyFactory: ${gelatoUserProxyFactory.address}
      \n GelatoUserProxyModule: ${gelatoUserProxyModule.address}
      \n FeeHandlerFactory: ${feeHandlerFactory.address}
      \n ActionPlaceOrderBatchExchange: ${actionPlaceOrderBatchExchange.address}
      \n ActionWithdrawBatchExchange: ${actionWithdrawBatchExchange.address}
      \n ActionERC20TransferFrom: ${actionERC20TransferFrom.address}
      \n ActionTransfer: ${actionTransfer.address}
      \n ActionUniswapTrade: ${actionUniswapTrade.address}
      \n ConditionTimeStateful: ${conditionTimeStateful.address}
      \n ConditionBalanceStateful: ${conditionBalanceStateful.address}
      \n ConditionKyberRateStateful: ${conditionKyberRateStateful.address}
      `
      );
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
