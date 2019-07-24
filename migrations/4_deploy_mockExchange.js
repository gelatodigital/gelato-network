const mockExchange = artifacts.require("DutchXMock")

module.exports = async (deployer, accounts) => {
    const _deployer = accounts[0];
    await deployer.deploy(mockExchange, _deployer);
    const mockExchangeContract = await mockExchange.deployed()
}