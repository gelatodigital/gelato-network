import env from "@nomiclabs/buidler";
const assert = require("assert");
import { checkNestedObj, getNestedObj } from "../helpers/nestedObjects";
import { sleep } from "../helpers/sleep";

const main = async contractName => {
  try {
    if (!contractName) contractName = process.env.CONTRACT_NAME;
    assert(
      Object.prototype.toString.call(contractName) === "[object String]",
      "contractName needs to be a string"
    );

    console.log(`\n\t\t Starting deployment sequence for ${contractName}`);

    await env.run("clean");
    await env.run("compile");

    let networkName = await env.run("network-current");
    if (networkName == "unknown") networkName = "buidlerevm";
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

    const ContractFactory = await env.ethers.getContract(contractName);
    const contract = await ContractFactory.deploy();
    console.log(
      `\n\t\t ${contractName} deployment tx hash:\n\t\t ${contract.deployTransaction.hash}`
    );
    await contract.deployed();

    console.log(`\n\t\t ${contractName} instantiated at: ${contract.address}`);

    if (contractName.startsWith("Action")) {
      const correctActionSelector = await contract.correctActionSelector();
      if (!correctActionSelector)
        throw new Error(
          `${contractName} instantiated with incorrect actionSelector - check source file.`
        );
    } else if (contractName.startsWith("Trigger")) {
      const correctTriggerSelector = await contract.correctTriggerSelector();
      if (!correctTriggerSelector)
        throw new Error(
          `${contractName} instantiated with incorrect triggerSelector - check source file.`
        );
    }
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
