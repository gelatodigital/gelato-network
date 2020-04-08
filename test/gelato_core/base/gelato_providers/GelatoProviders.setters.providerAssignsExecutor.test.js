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
  let otherExecutor;
  let otherExecutorAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [
      provider,
      otherProvider,
      executor,
      otherExecutor,
    ] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();
    executorAddress = await executor.getAddress();
    otherExecutorAddress = await otherExecutor.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // providerAssignsExecutor
  describe("GelatoCore.GelatoProviders.providerAssignsExecutor", function () {
    it("Should allow minStaked Providers to assign a minStaked Executor", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake
      );

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );
      // executorProvidersCount(prevExecutor)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(newExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);
    });

    it("Should allow minStaked Providers to reassign to other minStakedExecutor", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake
      );

      // providerAssignsExecutor
      await gelatoCore.providerAssignsExecutor(executorAddress);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(executor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);

      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // stakeExecutor: otherExecutor
      await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });
      expect(await gelatoCore.executorStake(otherExecutorAddress)).to.be.equal(
        minExecutorStake
      );

      // providerAssignsExecutor: otherExecutor
      await expect(gelatoCore.providerAssignsExecutor(otherExecutorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(providerAddress, executorAddress, otherExecutorAddress);
      // executorProvidersCount(prevExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount - 1);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        otherExecutorAddress
      );
      // executorProvidersCount(newExecutor)
      expect(
        await gelatoCore.executorProvidersCount(otherExecutorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);
    });

    it("Should NOT allow minStaked Providers to assign the same Executor again", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake
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

      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // providerAssignsExecutor again
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: already assigned."
      );
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(sameExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount);
    });

    it("Should NOT allow minStaked Providers to assign a not-minStaked Executor", async function () {
      // provideFunds(minProviderStake)
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderStake,
      });
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderStake
      );

      // providerAssignsExecutor
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.revertedWith(
        "GelatoProviders.providerAssignsExecutor: isExecutorMinStaked()"
      );
      // executorProvidersCount(prev)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        initialState.executorByProvider
      );
      // executorProvidersCount(new)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount);
    });

    it("Should NOT allow illiquid Providers to assign an Executor", async function () {
      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake
      );

      // providerAssignsExecutor
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: isProviderMinStaked()"
      );
      // executorProvidersCount(prev)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        initialState.executorByProvider
      );
      // executorProvidersCount(new)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount);
    });
  });
});
