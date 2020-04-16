// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { utils } = require("ethers");

describe("GelatoCore - GelatoGasPriceOracle - Setters:", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;

  let owner;
  let oracleAdmin;
  let randomGuy;

  let ownerAddress;
  let oracleAdminAddress;
  let randomGuyAddress;

  let gelatoCore;
  let otherGelatoCore;
  let gelatoGasPriceOracle;

  const INITIAL_GAS_PRICE = utils.parseUnits("5", "gwei");

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoCore = await GelatoCoreFactory.deploy();
    otherGelatoCore = await GelatoCoreFactory.deploy();

    if (gelatoCore === otherGelatoCore) {
      throw new Error(
        "GelatoGasPriceOracle.setters.test: GelatoCore identical"
      );
    }

    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoCore.address,
      INITIAL_GAS_PRICE
    );

    await gelatoGasPriceOracle.deployed();
    await gelatoCore.deployed();

    [owner, oracleAdmin, randomGuy] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    oracleAdminAddress = await oracleAdmin.getAddress();
    randomGuyAddress = await randomGuy.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // setOracleAdmin
  describe("GelatoCore.GelatoGasPriceOracle.setOracleAdmin", function () {
    it("Should let the owner setOracleAdmin", async function () {
      // oracleAdmin
      expect(await gelatoGasPriceOracle.oracleAdmin()).to.be.equal(
        ownerAddress
      );

      // setOracleAdmin()
      await expect(gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress))
        .to.emit(gelatoGasPriceOracle, "LogSetOracleAdmin")
        .withArgs(ownerAddress, oracleAdminAddress);

      // oracleAdmin
      expect(await gelatoGasPriceOracle.oracleAdmin()).to.be.equal(
        oracleAdminAddress
      );
    });

    it("Should NOT let non-Owners setOracleAdmin", async function () {
      // setOracleAdmin: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setOracleAdmin(oracleAdminAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // setOracleAdmin
      await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

      // setOracleAdmin: revert
      await expect(
        gelatoGasPriceOracle
          .connect(oracleAdmin)
          .setOracleAdmin(randomGuyAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setGelatoCore
  describe("GelatoCore.GelatoGasPriceOracle.setGelatoCore", function () {
    it("Should let the owner setGelatoCore", async function () {
      // oracleAdmin
      expect(await gelatoGasPriceOracle.gelatoCore()).to.be.equal(
        gelatoCore.address
      );

      // setGelatoCore()
      await expect(gelatoGasPriceOracle.setGelatoCore(otherGelatoCore.address))
        .to.emit(gelatoGasPriceOracle, "LogSetGelatoCore")
        .withArgs(gelatoCore.address, otherGelatoCore.address);

      // oracleAdmin
      expect(await gelatoGasPriceOracle.gelatoCore()).to.be.equal(
        otherGelatoCore.address
      );
    });

    it("Should NOT let non-Owners setOracleAdmin", async function () {
      // setGelatoCore: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setGelatoCore(otherGelatoCore.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // setOracleAdmin
      await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

      // setGelatoCore: revert
      await expect(
        gelatoGasPriceOracle
          .connect(oracleAdmin)
          .setGelatoCore(otherGelatoCore.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setGasPrice
  describe("GelatoCore.GelatoGasPriceOracle.setGasPrice", function () {
    it("Should let the oracleAdmin setGasPrice", async function () {
      const newGasPrice = INITIAL_GAS_PRICE.add(42069);

      // setGasPrice()
      await expect(gelatoGasPriceOracle.setGasPrice(newGasPrice))
        .to.emit(gelatoGasPriceOracle, "LogSetGasPrice")
        .withArgs(INITIAL_GAS_PRICE, newGasPrice);

      // setOracleAdmin()
      await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

      // setGasPrice()
      await expect(
        gelatoGasPriceOracle
          .connect(oracleAdmin)
          .setGasPrice(newGasPrice.add(69420))
      )
        .to.emit(gelatoGasPriceOracle, "LogSetGasPrice")
        .withArgs(newGasPrice, newGasPrice.add(69420));

      // gasPrice
      await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
        "GelatoGasPriceOracle.onlyGelatoCore"
      );
    });

    it("Should NOT let non-OracleAdmins setGasPrice", async function () {
      // setOracleAdmin()
      await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(owner)
          .setGasPrice(INITIAL_GAS_PRICE.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracleAdmin");

      // setOracleAdmin
      await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setGasPrice(INITIAL_GAS_PRICE.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracleAdmin");
    });
  });
});
