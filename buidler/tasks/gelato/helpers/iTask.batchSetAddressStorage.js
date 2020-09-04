import { task } from "@nomiclabs/buidler/config";

export default task(
  "batchSetAddressStorage",
  `Returns the <taskReceiptArray> and if not present fetches its values from networks logs`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // Gelato Provider is the 3rd signer account
      const sysAdmin = getSysAdmin();
      const gelatoAddressStorage = await run("instantiateContract", {
        contractname: "GelatoAddressStorage",
        signer: sysAdmin,
        write: true,
      });
      let newAddresses = [];
      if (network.name === "rinkeby") {
        newAddresses = [
          {
            key: "gelatoCore",
            value: "0x733aDEf4f8346FD96107d8d6605eA9ab5645d632",
          },
          {
            key: "gelatoProvider",
            value: "0x8Cdfa728E101076bC59864f7737ca6a7149d3262",
          },
          {
            key: "providerModuleGnosisSafe",
            value: "0x2661B579243c49988D9eDAf114Bfac5c5E249287",
          },
          {
            key: "conditionTime",
            value: "0xC92Bc7c905d52B4bC4d60719a8Bce3B643d77daF",
          },
          {
            key: "actionWithdrawLiquidityOmen",
            value: "0x5cbc4684a32b174837f2b2dd0016512fd70d0174",
          },
        ];
      }

      if (network.name === "mainnet") {
        newAddresses = [
          {
            key: "gelatoCore",
            value: "0x1d681d76ce96E4d70a88A00EBbcfc1E47808d0b8",
          },
          {
            key: "gelatoProvider",
            value: "0x8Cdfa728E101076bC59864f7737ca6a7149d3262",
          },
          {
            key: "providerModuleGnosisSafe",
            value: "0x3a994Cd3a464032B8d0eAa16F91C446A46c4fEbC",
          },
          {
            key: "conditionTime",
            value: "0x63129681c487d231aa9148e1e21837165f38deaf",
          },
          {
            key: "actionWithdrawLiquidityOmen",
            value: "0x347Cb322a751310191D677f66e65df6e952Ed070",
          },
        ];
      }
      const tx = await gelatoAddressStorage.batchSetAddress(newAddresses);
      if (log) console.log(`\n txHash setAddress: ${tx.hash}\n`);
      console.log(`Tx Hash; ${tx.hash}`);
      await tx.wait();
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
