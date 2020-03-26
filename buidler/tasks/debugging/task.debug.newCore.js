import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

const CONDITION_NAME = "MockConditionDummy";
const ACTION_NAME = "MockActionDummy";

export default task("gc-debug-newcore")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async ({ events, log }) => {
    try {
      // if (network.name !== "buidlerevm") throw new Error("\n buidlerevmonly\n");

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
          condition ? [condition.address] : [constants.AddressZero],
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
        executorfeeceil: 5,
        oraclefeeceil: 2,
        gelatoexecutor: testAccount,
        providerindex: testAccountIndex,
        events,
        log
      });

      // === GelatoUserProxy setup ===
      const gelatoUserProxyAddress = await run("gupf-creategelatouserproxy", {
        funding: "0",
        factoryaddress: gelatoUserProxyFactory.address,
        events,
        log
      });

      // === Minting ===
      const conditionPayload = constants.HashZero;
      const actionPayload = constants.HashZero;

      const execClaim = {
        id: constants.HashZero,
        provider: testAccount,
        providerModule: providerModuleGelatoUserProxy.address,
        user: constants.AddressZero,
        condition: condition ? condition.address : constants.AddressZero,
        action: action.address,
        conditionPayload: conditionPayload,
        actionPayload: actionPayload,
        expiryDate: constants.HashZero,
        executorSuccessFeeFactor: 5,
        oracleSuccessFeeFactor: 2
      };

      const gelatoUserProxy = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: gelatoUserProxyAddress,
        write: true
      });

      let mintTx;
      try {
        mintTx = await gelatoUserProxy.mintExecClaim(execClaim, testAccount);
      } catch (error) {
        console.error(`\n gc-debug-newcore: mintExecClaim\n`, error);
        throw new Error(`\n gelatoUserProxy.mintExecClaim: PRE tx error \n`);
      }

      let mintTxBlockHash;
      try {
        const { blockHash } = await mintTx.wait();
        mintTxBlockHash = blockHash;
      } catch (error) {
        console.error(`\n gc-debug-newcore: mintExecClaim\n`, error);
        throw new Error(`\n gelatoUserProxy.mintExecClaim: tx error \n`);
      }

      if (events) {
        await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecClaimMinted",
          contractaddress: gelatoCore.address,
          txhash: mintTx.hash,
          blockhash: mintTxBlockHash,
          log: true
        });
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
