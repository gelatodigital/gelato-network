import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task("gc-debug-newcore")
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name !== "buidlerevm") throw new Error(" buidlerevmonly\n");

      // Deployments
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore"
      });
      const mockActionChainedTimed = await run("deploy", {
        contractname: "MockActionChainedTimed",
        constructorargs: [gelatoCore.address]
      });
      const gelatoUserProxyFactory = await run("deploy", {
        contractname: "GelatoUserProxyFactory",
        constructorargs: [gelatoCore.address]
      });

      // ProviderModuleGelatoUserProxy
      const extcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
      const actionWithGasPriceCeil = {
        _address: mockActionChainedTimed.address,
        gasPriceCeil: utils.parseUnits(20, "gwei")
      };
      const providerModuleGelatoUserProxy = await run("deploy", {
        contractname: "ProviderModuleGelatoUserProxy",
        constructorargs: [
          gelatoUserProxyFactory.address,
          [extcodehash], // hashes
          [constants.AddressZero], // conditions
          [actionWithGasPriceCeil]
        ]
      });
      if (log) {
        const eventnames = [
          "LogProvideProxyExtcodehash",
          "LogProvideCondition",
          "LogProvideAction",
          "LogSetActionGasPriceCeil"
        ];
        for (const eventname of eventnames) {
          await run("event-getparsedlog", {
            contractname: "ProviderModuleGelatoUserProxy",
            contractaddress: providerModuleGelatoUserProxy.address,
            eventname,
            blockhash,
            txhash: createTx.hash,
            values: true,
            log
          });
        }
      }
      // ===

      // === GelatoCore setup ===
      // Executor
      await run("gc-registerexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorindex: 1,
        log
      });

      // Provider

      // ProviderModule

      // === GelatoUserProxy setup ===
      const createTx = await gelatoUserProxyFactory.create();
      const { blockHash: blockhash } = await createTx.wait();
      const { userProxy } = await run("event-getparsedlog", {
        contractname: "GelatoUserProxyFactory",
        contractaddress: gelatoUserProxyFactory.address,
        eventname: "LogCreation",
        blockhash,
        txhash: createTx.hash,
        values: true,
        log
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
