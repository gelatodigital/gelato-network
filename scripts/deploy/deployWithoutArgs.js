import env from "@nomiclabs/buidler";
import sleep from "../helpers/sleep";

const main = async () => {
  try {
    const contractName = process.env.CONTRACT_NAME;
    if (typeof contractName != "string") {
      throw new Error("contractName needs to be a string");
    }
    console.log(`\n\t\t Starting deployment sequence for ${contractName}`);
    await env.run("compile");
    await env.run("network-current");
    const ContractFactory = await env.ethers.getContract(contractName);
    console.log(ContractFactory);
    await sleep(1000000);
    const contract = await ContractFactory.deploy("");
    console.log(
      `\n\t\t ${contractName} deployment tx hash:\n\t\t ${contract.deployTransaction.hash}`
    );
    await contract.deployed();
    console.log(`\n\t\t ${contractName} instantiated at: ${contract.address}`);
  } catch (error) {
    console.error(error);
  }
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

export default main;
