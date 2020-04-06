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

      const testSignerIndex = 0;
      const [{ _address: testSigner }] = await ethers.getSigners();

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
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorindex: testSignerIndex,
        events,
        log
      });

      // Provider
      await run("gc-batchprovide", {
        gelatocoreaddress: gelatoCore.address,
        ethamount: "0.2",
        modules: [providerModuleGelatoUserProxy.address],
        executorshareceil: 5,
        gasadminshareceil: 2,
        gelatoexecutor: testSigner,
        providerindex: testSignerIndex,
        events,
        log
      });

      // === GelatoUserProxy setup ===
      const gelatoUserProxyAddress = await run("gupf-creategelatouserproxy", {
        factoryaddress: gelatoUserProxyFactory.address,
        funding: "0",
        events,
        log
      });

      // === Minting ===
      const conditionPayload = constants.HashZero;
      const actionPayload = constants.HashZero;

      const execClaim = {
        id: constants.HashZero,
        provider: testSigner,
        providerModule: providerModuleGelatoUserProxy.address,
        user: constants.AddressZero,
        condition: condition ? condition.address : constants.AddressZero,
        action: action.address,
        conditionPayload: conditionPayload,
        actionPayload: actionPayload,
        expiryDate: constants.HashZero,
        executorSuccessShare: 5,
        sysAdminSuccessShare: 2
      };

      const gelatoUserProxy = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: gelatoUserProxyAddress,
        write: true
      });

      let mintTx;
      try {
        mintTx = await gelatoUserProxy.mintExecClaim(execClaim, testSigner);
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

      /* buidlerEVM bug
      if (events) {
        await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecClaimMinted",
          contractaddress: gelatoCore.address,
          txhash: mintTx.hash,
          blockhash: mintTxBlockHash,
          log: true
        });
      } */

      // === Execution ===
      execClaim.id = utils.bigNumberify("1");
      execClaim.userProxy = gelatoUserProxy.address;
      const iFace = await run("ethers-interface-new", {
        contractname: "GelatoCore"
      });
      console.log(iFace.events.LogExecClaimMinted);
      await sleep(100000);
      const encodedExecClaim = iFace.events.LogExecClaimMinted.execClaim.encode(
        execClaim
      );
      console.log(encodedExecClaim);
      await sleep(100000);
      const execClaimHash =
        "0x51992e18c92053b7677003e2a86c5077a7ace82639873e8e63ef55ca806188fc";
      const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();

      const canExecResult = await gelatoCore.canExec(
        execClaim,
        execClaimHash,
        gelatoGasPrice,
        gelatoMaxGas
      );
      if (log) console.log(`\n canExecuteResult: ${canExecResult}`);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
