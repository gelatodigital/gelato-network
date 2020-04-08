// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: EXECUTOR", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let provider;
  let providerAddress;
  let otherProvider;
  let otherProviderAddress;
  let executor;
  let executorAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [provider, otherProvider, executor] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();
    executorAddress = await executor.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // providerAssignsExecutor
  describe("GelatoCore.GelatoProviders.providerAssignsExecutor", function () {
    it("Should allow liquid Providers to assign an Executor", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
    });

    it("Shouldn't allow liquid providers to assign the same Executor again", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );

      // providerAssignsExecutor again
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: already assigned."
      );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
    });

    it("Shouldn't allow liquid providers to assign other Provider's Executor", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );

      // providerAssignsExecutor again
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: already assigned."
      );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
    });
  });

  // unprovideFunds
  /*
  it("Shouldn't allow Providers with an assigned Executor to unprovide their funds", async function () {
    // provideFunds(): minProviderStake required for providerAssignsExecutor
    const minProviderStake = await gelatoCore.minProviderStake();
    await expect(
      gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      })
    )
      .to.emit(gelatoCore, "LogProvideFunds")
      .withArgs(providerAddress, minProviderStake, minProviderStake);
    expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
      minProviderStake
    );

    // stakeExecutor() (needed for providerAssignsExecutor())
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: await gelatoCore.minExecutorStake() });
    expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
      await gelatoCore.minExecutorStake()
    );

    // providerAssignsExecutor (needs executoMinStake)
    await expect(gelatoCore.providerAssignsExecutor(executorAddress))
      .to.emit(gelatoCore, "LogProviderAssignsExecutor")
      .withArgs(
        providerAddress,
        initialState.executorByProvider,
        executorAddress
      );
    expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
      executorAddress
    );

    // unprovideFunds
    await expect(gelatoCore.unprovideFunds(1)).to.be.revertedWith(
      "GelatoProviders.unprovideFunds: Must un-assign executor first"
    );

    expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
      minProviderStake
    );
    expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
      executorAddress
    );
  });
  */
});
