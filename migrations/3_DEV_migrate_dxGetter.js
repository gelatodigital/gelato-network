const DutchXGetter = artifacts.require("DutchXGetter");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");

module.exports = async (deployer, network, accounts) => {
  const dutchExchangeProxy = await DutchExchangeProxy.deployed();
  const _deployer = accounts[0];
  await deployer.deploy(DutchXGetter, dutchExchangeProxy.address, {
    from: _deployer,
    overwrite: false
  });
  const dxGetter = await DutchXGetter.deployed();
  console.log(`dxGetter: ${dxGetter.address}\n\n`);
};
