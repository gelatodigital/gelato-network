import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const CONDITION_NAME = "MockConditionDummy";
const ACTION_NAME = "MockActionDummy";

export default task("gc-debug-newcore")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async ({ events, log }) => {
    try {
      if (network.name !== "buidlerevm") throw new Error("\n buidlerevmonly\n");

      const testAccountIndex = 0;
      const [{ _address: testAccount }] = await ethers.signers();

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log
      });
      // Condition
      const condition = await run("deploy", {
        contractname: CONDITION_NAME,
        log
      });
      // Action
      const action = await run("deploy", {
        contractname: ACTION_NAME,
        log
      });
      // GelatoUserProxy Factory
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address],
        log
      });
      // ProviderModule GelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const actionWithGasPriceCeil = {
        _address: action.address,
        gasPriceCeil: utils.parseUnits("20", "gwei")
      };
      const providerModuleGelatoUserProxy = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [
          [extcodehash],
          [constants.AddressZero], // conditions
          [actionWithGasPriceCeil]
        ],
        events,
        log
      });

      // === GelatoCore setup ===
      // Executor
      await run("gc-registerexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorclaimlifespan: 5184000,
        executorsuccessfeefactor: 5,
        executorindex: testAccountIndex,
        events,
        log
      });

      // Provider
      await run("gc-registerprovider", {
        gelatocoreaddress: gelatoCore.address,
        ethamount: "0.2",
        modules: [providerModuleGelatoUserProxy.address],
        gelatoexecutor: testAccount,
        providerindex: testAccountIndex,
        events,
        log
      });

      // === GelatoUserProxy setup ===
      const gelatoUserProxy = await run("gupf-creategelatouserproxy", {
        funding: "0",
        factoryaddress: gelatoUserProxyFactory.address,
        events,
        log
      });

      // === Minting ===
      const conditionPayload = constants.HashZero;
      const actionPayload = constants.HashZero;
      const execclaim = {
        provider: testAccount,
        providerModule: providerModuleGelatoUserProxy.address,
        condition: condition ? condition.address : constants.AddressZero,
        action: action.address,
        conditionPayload: conditionPayload,
        actionPayload: actionPayload,
        expiryDate: constants.HashZero,
        executorSuccessFeeFactor: 5,
        oracleSuccessFeeFactor: 5
      };
      await run("gc-mintexecclaim", {
        gelatocoreaddress: gelatoCore.address,
        execclaim,
        gelatoexecutor: testAccount,
        events,
        log
      });
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
