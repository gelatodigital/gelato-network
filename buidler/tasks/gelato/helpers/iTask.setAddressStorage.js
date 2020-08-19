import { task } from "@nomiclabs/buidler/config";

export default task(
  "setAddressStorage",
  `Returns the <taskReceiptArray> and if not present fetches its values from networks logs`
)
  .addPositionalParam("string", "Key of the key value pair")
  .addPositionalParam("address", "Value of the key value pair")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ string, address, log }) => {
    try {
      if (log)
        console.log(`
      \n String: ${string}
      \n Address: ${address}
      `);
      // Gelato Provider is the 3rd signer account
      const sysAdmin = getSysAdmin();
      const gelatoAddressStorage = await run("instantiateContract", {
        contractname: "GelatoAddressStorage",
        signer: sysAdmin,
        write: true,
      });
      const tx = await gelatoAddressStorage.setAddress(string, address);
      if (log) console.log(`\n txHash setAddress: ${tx.hash}\n`);
      console.log(`Tx Hash; ${tx.hash}`);
      await tx.wait();
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
