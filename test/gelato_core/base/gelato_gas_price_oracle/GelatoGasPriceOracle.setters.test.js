// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import initialState from "./GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoGasPriceOracle - Setters:", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;

  let owner;
  let oracle;
  let randomGuy;

  let ownerAddress;
  let oracleAddress;
  let randomGuyAddress;

  let gelatoCore;
  let otherGelatoCore;
  let gelatoGasPriceOracle;

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
      initialState.gasPrice
    );

    await gelatoGasPriceOracle.deployed();
    await gelatoCore.deployed();

    [owner, oracle, randomGuy] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    oracleAddress = await oracle.getAddress();
    randomGuyAddress = await randomGuy.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // setOracle
  describe("GelatoCore.GelatoGasPriceOracle.setOracle", function () {
    it("Should let the owner setOracle", async function () {
      // oracle
      expect(await gelatoGasPriceOracle.oracle()).to.be.equal(
        ownerAddress
      );

      // setOracle()
      await expect(gelatoGasPriceOracle.setOracle(oracleAddress))
        .to.emit(gelatoGasPriceOracle, "LogSetOracle")
        .withArgs(ownerAddress, oracleAddress);

      // oracle
      expect(await gelatoGasPriceOracle.oracle()).to.be.equal(
        oracleAddress
      );
    });

    it("Should NOT let non-Owners setOracle", async function () {
      // setOracle: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setOracle(oracleAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // setOracle
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setOracle: revert
      await expect(
        gelatoGasPriceOracle
          .connect(oracle)
          .setOracle(randomGuyAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setGelatoCore
  describe("GelatoCore.GelatoGasPriceOracle.setGelatoCore", function () {
    it("Should let the owner setGelatoCore", async function () {
      // oracle
      expect(await gelatoGasPriceOracle.gelatoCore()).to.be.equal(
        gelatoCore.address
      );

      // setGelatoCore()
      await expect(gelatoGasPriceOracle.setGelatoCore(otherGelatoCore.address))
        .to.emit(gelatoGasPriceOracle, "LogSetGelatoCore")
        .withArgs(gelatoCore.address, otherGelatoCore.address);

      // oracle
      expect(await gelatoGasPriceOracle.gelatoCore()).to.be.equal(
        otherGelatoCore.address
      );
    });

    it("Should NOT let non-Owners setOracle", async function () {
      // setGelatoCore: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setGelatoCore(otherGelatoCore.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // setOracle
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGelatoCore: revert
      await expect(
        gelatoGasPriceOracle
          .connect(oracle)
          .setGelatoCore(otherGelatoCore.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setGasPrice
  describe("GelatoCore.GelatoGasPriceOracle.setGasPrice", function () {
    it("Should let the oracle setGasPrice", async function () {
      const newGasPrice = initialState.gasPrice.add(42069);

      // setGasPrice()
      await expect(gelatoGasPriceOracle.setGasPrice(newGasPrice))
        .to.emit(gelatoGasPriceOracle, "LogSetGasPrice")
        .withArgs(initialState.gasPrice, newGasPrice);

      // setOracle()
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice()
      await expect(
        gelatoGasPriceOracle
          .connect(oracle)
          .setGasPrice(newGasPrice.add(69420))
      )
        .to.emit(gelatoGasPriceOracle, "LogSetGasPrice")
        .withArgs(newGasPrice, newGasPrice.add(69420));

      // gasPrice
      await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
        "GelatoGasPriceOracle.onlyGelatoCore"
      );
    });

    it("Should NOT let non-Oracles setGasPrice", async function () {
      // setOracle()
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(owner)
          .setGasPrice(initialState.gasPrice.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracle");

      // setOracle
      await gelatoGasPriceOracle.setOracle(oracleAddress);

      // setGasPrice: revert
      await expect(
        gelatoGasPriceOracle
          .connect(randomGuy)
          .setGasPrice(initialState.gasPrice.add(42069))
      ).to.be.revertedWith("GelatoGasPriceOracle.onlyOracle");
    });
  });
});
