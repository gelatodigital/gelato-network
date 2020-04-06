import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-determineGnosisProxyAddress",
  `Determines future gnosis proxy address with .calculateCreateProxyWithNonceAddress(address _mastercopy, bytes calldata initializer, uint256 saltNonce) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "initializer",
    "Payload for gnosis safe proxy setup tasks",
    constants.AddressZero
  )
  .addOptionalParam(
    "mastercopy",
    "The deployed implementation code the created proxy should point to"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      const saltNonce = 1;
      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy"
        });
      }

      const gnosisSafeProxyFactoryAbi = [
        `function calculateCreateProxyWithNonceAddress(address _mastercopy, bytes initializer, uint256 saltNonce) external returns (GnosisSafeProxy proxy)`
      ];

      const gnosisSafeProxyFactoryAddress = await run("bre-config", {
        addressbookcategory: "gnosisSafe",
        addressbookentry: "gnosisSafeProxyFactory"
      });

      const { [1]: signer } = await ethers.getSigners();

      const gnosisSafeProxyFactory = new ethers.Contract(
        gnosisSafeProxyFactoryAddress,
        gnosisSafeProxyFactoryAbi,
        signer
      );

      try {
        const futureProxyAddress = await gnosisSafeProxyFactory.calculateCreateProxyWithNonceAddress(
          taskArgs.mastercopy,
          taskArgs.initializer,
          saltNonce
        );
        return futureProxyAddress;
      } catch (error) {
        console.log(error);
      }

      if (taskArgs.log)
        console.log(`\ futureProxyAddress: ${futureProxyAddress}\n`);
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
