// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: FUNDS", function () {
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

  // provideFunds
  describe("GelatoCore.GelatoProviders.provideFunds", function () {
    it("Should allow anyone to provideFunds to their own Provider", async function () {
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      await expect(
        gelatoCore
          .connect(otherProvider)
          .provideFunds(otherProviderAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(otherProviderAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42069
      );
    });

    it("Should allow anyone to provideFunds to other Providers", async function () {
      await expect(
        gelatoCore.provideFunds(otherProviderAddress, { value: 69420 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(otherProviderAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        69420
      );

      await expect(
        gelatoCore
          .connect(otherProvider)
          .provideFunds(providerAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        42069
      );
    });

    it("Should NOT allow provideFunds(value: 0)", async function () {
      await expect(
        gelatoCore.provideFunds(providerAddress, { value: "0" })
      ).to.be.revertedWith("GelatoProviders.provideFunds: zero value");
    });
  });

  // unprovideFunds
  describe("GelatoCore.GelatoProviders.unprovideFunds", function () {
    it("Should allow Providers to unprovide their funds", async function () {
      // provideFunds
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      // unprovideFunds
      await expect(gelatoCore.unprovideFunds(69420))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(0);

      // otherProvider: provideFunds
      await expect(
        gelatoCore
          .connect(otherProvider)
          .provideFunds(otherProviderAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(otherProviderAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42069
      );

      // otherProvider: unprovideFunds
      await expect(gelatoCore.connect(otherProvider).unprovideFunds(69))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(otherProviderAddress, 69, 42000);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42000
      );
    });

    it("Should automatically unprovideFunds(all) if surplus withdrawamount", async function () {
      // provideFunds
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      // unprovideFunds
      await expect(gelatoCore.unprovideFunds(999999999999))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(0);
    });
  });

  // unprovideFunds
  it("Should NOT allow Providers with an assigned Executor to unprovide their funds", async function () {
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

  // unprovideFunds
  it("Should allow Providers to unassign Executor and unprovideFunds", async function () {
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

    // provider unassigns Executor
    await expect(gelatoCore.providerAssignsExecutor(constants.AddressZero))
      .to.emit(gelatoCore, "LogProviderAssignsExecutor")
      .withArgs(providerAddress, executorAddress, constants.AddressZero);
    expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
      constants.AddressZero
    );

    // unprovideFunds
    await expect(gelatoCore.unprovideFunds(minProviderStake))
      .to.emit(gelatoCore, "LogUnprovideFunds")
      .withArgs(providerAddress, minProviderStake, 0);
    expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(0);
  });
});
