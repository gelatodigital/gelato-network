import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";
import { utils, constants } from "ethers";

export default task(
  "deploy-gnosis-safe-module",
  `Deploys the ProviderModuleGnosisSafe on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam(
    "mastercopy",
    "addresses of gnosis safe mastercopys to whitelist"
  )
  .addOptionalParam(
    "extcodehash",
    "bytes of gnosis safe extcodehash to whitelist"
  )
  .addOptionalParam(
    "gelatoactionpipeline",
    "address of gelatoactionpipeline contract to whitelist"
  )
  .addOptionalParam(
    "gelatocore",
    "address of gelatoactionpipeline contract to whitelist"
  )
  .addOptionalParam(
    "nonceaddition",
    "addition to nonce for deploy script",
    0,
    types.int
  )
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // TaskArgs Sanitzation
      // Gelato Provider is the 3rd signer account
      const sysAdmin = getSysAdmin();

      if (!sysAdmin) throw new Error("\n sysAdmin not instantiated \n");

      if (!taskArgs.gelatocore)
        taskArgs.gelatocore = await run("bre-config", {
          contractname: "GelatoCore",
          deployments: true,
        });
      console.log(taskArgs.gelatocore);

      // 1. Get Mastercopy
      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopyOneOneOne",
        });
      }

      // get gelatoactionpipeline contract
      if (!taskArgs.gelatoactionpipeline)
        taskArgs.gelatoactionpipeline = await run("bre-config", {
          deployments: true,
          contractname: "GelatoActionPipeline",
        });
      console.log(taskArgs.gelatoactionpipeline);

      if (!taskArgs.extcodehash) {
        // 1. Get extcodehash of Gnosis Safe
        const safeAddress = await run("gc-determineCpkProxyAddress");
        console.log(safeAddress);
        let providerToRead = ethers.provider;
        const extcode = await providerToRead.getCode(safeAddress);
        taskArgs.extcodehash = utils.solidityKeccak256(["bytes"], [extcode]);
      }

      const providerModuleGnosisSafeProxy = await run("gc-deploy", {
        contractname: "ProviderModuleGnosisSafeProxy",
        constructorargs: [
          [taskArgs.extcodehash],
          [taskArgs.mastercopy],
          taskArgs.gelatocore,
          taskArgs.gelatoactionpipeline,
        ],
        nonceaddition: taskArgs.nonceaddition,
        events: taskArgs.events,
        log: taskArgs.log,
        signer: sysAdmin,
      });

      if (taskArgs.log)
        console.log(
          `Provider Module Gnosis Safe Proxy Address: ${providerModuleGnosisSafeProxy.address}`
        );
      return providerModuleGnosisSafeProxy;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
