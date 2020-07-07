import { constants, utils } from "ethers";
import { ethers } from "@nomiclabs/buidler";

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { provider } = await getNamedAccounts();
  const providerSigner = ethers.provider.getSigner(provider);
  const { deploy, log } = deployments;

  // 1. Fetch Gelato Core
  // @dev Acctoung "gasPriceOracle" can change gas prices for testing purposes
  const GelatoCore = await deployments.get("GelatoCore");

  // 2. Deploy GelatoUserProxy Factory
  const GelatoUserProxyFactory = await deploy("GelatoUserProxyFactory", {
    from: provider,
    gas: 4000000,
    args: [GelatoCore.address],
  });

  // 3. Deploy GelatoActionPipeline
  const GelatoActionPipeline = await deploy("GelatoActionPipeline", {
    from: provider,
    gas: 4000000,
    args: [],
  });

  const ProviderModuleGelatoUserProxy = await deploy(
    "ProviderModuleGelatoUserProxy",
    {
      from: provider,
      gas: 4000000,
      args: [GelatoUserProxyFactory.address, GelatoActionPipeline.address],
    }
  );

  if (
    GelatoUserProxyFactory.newlyDeployed &&
    GelatoActionPipeline.newlyDeployed &&
    ProviderModuleGelatoUserProxy.newlyDeployed
  ) {
    log(
      `// ==== GelatoUserProxyFactory deployed => ${GelatoUserProxyFactory.address} ====`
    );
    log(
      `// ==== GelatoActionPipeline deployed => ${GelatoActionPipeline.address} ====`
    );
    log(
      `// ==== GelatoActionPipeline deployed => ${ProviderModuleGelatoUserProxy.address} ====`
    );
  }
};

module.exports.tags = ["ProviderModules"];
module.exports.dependencies = ["GelatoCore"];
