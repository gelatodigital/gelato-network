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
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Log taskArgs and tx hashes inter alia")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);
      if (!taskArgs.gelatogasprice)
        taskArgs.gelatogasprice = GELATO_GAS_PRICE.toString();

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("gc-deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // GelatoUserProxy Factory
      const gelatoUserProxyFactory = await run("gc-deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
        log: taskArgs.log,
      });

      // ProviderModule GelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const providerModuleGelatoUserProxy = await run("gc-deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [[extcodehash]],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Optional Condition
      let conditionAddress;
      if (taskArgs.conditionname) {
        const { address } = await run("gc-deploy", {
          contractname: taskArgs.conditionname,
          log: taskArgs.log,
        });
        conditionAddress = address;
      }

      // Action
      let actionAddresses = [];
      let tempArray = [];

      // NoDataActions for TaskSpec
      const actions = [];
      for (const address of actionAddresses) {
        const action = new NoDataAction({
          addr: address,
          data: constants.HashZero,
          operation: Operation.Delegatecall,
          termsOkCheck: true,
        });
        actions.push(action);
      }

      // Condition Actions Mix (TaskSpec)
      const taskSpec = new TaskSpec({
        conditions: conditionAddress
          ? [conditionAddress]
          : [constants.AddressZero],
        actions,
        gasPriceCeil: utils.parseUnits("20", "gwei"),
      });

      // === GelatoCore setup ===
      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Provider
      const [_, executor, provider] = await ethers.getSigners();
      const executorAddress = await executor.getAddress();

      await gelatoCore
        .connect(provider)
        .provideFunds(await provider.getAddress(), {
          value: utils.parseEther("0.1"),
        });

      await gelatoCore
        .connect(provider)
        .multiProvide(
          executorAddress,
          [taskSpec],
          [providerModuleGelatoUserProxy.address]
        );

      // === GelatoUserProxy setup ===
      await run("gupf-creategelatouserproxy", {
        factoryaddress: gelatoUserProxyFactory.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      return {
        gelatoCore,
        gelatoUserProxyFactory,
        providerModuleGelatoUserProxy,
        taskSpec,
        conditionAddress,
      };
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
