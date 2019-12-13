const assert = require("assert");
import { checkNestedObj, getNestedObj } from "../../helpers/nestedObjects";
import { sleep } from "../../helpers/sleep";

export default async (taskArgs, env) => {
  try {
    const contractName = taskArgs.contractName;
    const networkName = await env.run("network-connected");
    if (checkNestedObj(env.config, "networks", networkName, "contracts")) {
      const contracts = getNestedObj(
        env.config,
        "networks",
        networkName,
        "contracts"
      );
      assert(
        Array.isArray(contracts) && contracts.includes(contractName),
        `contract is not member of Array: network.${networkName}.contracts inside buidler.config.js`
      );
    } else {
      throw new Error(
        `No network.${networkName}.contracts inside buidler.config.js`
      );
    }

    console.log(`\n\t\t Starting deployment sequence for ${contractName}`);

    await env.run("clean");
    await env.run("compile");

    const ContractFactory = await env.ethers.getContract(contractName);
    const contract = await ContractFactory.deploy();
    console.log(
      `\n\t\t ${contractName} deployment tx hash:\n\t\t ${contract.deployTransaction.hash}`
    );
    await contract.deployed();
    console.log(`\n\t\t ${contractName} instantiated at: ${contract.address}`);
    return contract.address;
  } catch (error) {
    console.error(error);
  }
};
