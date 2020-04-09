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
  let executor;
  let executorAddress;
  let otherExecutor;
  let otherExecutorAddress;
  let provider;
  let providerAddress;
  let otherProvider;
  let otherProviderAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [
      executor,
      otherExecutor,
      provider,
      otherProvider,
    ] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();
    executorAddress = await executor.getAddress();
    otherExecutorAddress = await otherExecutor.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // executorAssignsExecutor
  describe("GelatoCore.GelatoProviders.executorAssignsExecutor", function () {
    it("Should allow minStaked Executors to reassign to another minStaked Executor", async function () {
      // stakeExecutor() (needed for executorAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore.stakeExecutor({ value: minExecutorStake });

      // stakeExecutor(): otherExecutor
      await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });

      // provideFunds()
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.connect(provider).provideFunds(providerAddress, {
        value: minProviderStake,
      });

      // providerAssignsExecutor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // executorAssignsExecutor
      await expect(
        gelatoCore.executorAssignsExecutor(
          providerAddress,
          otherExecutorAddress
        )
      )
        .to.emit(gelatoCore, "LogExecutorAssignsExecutor")
        .withArgs(providerAddress, executorAddress, otherExecutorAddress);
      // executorProvidersCount(executor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount - 1);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        otherExecutorAddress
      );
      // executorProvidersCount(otherExecutor)
      expect(
        await gelatoCore.executorProvidersCount(otherExecutorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);
    });

    it("Should only allow the assigned Executors to reassign", async function () {
      // stakeExecutor()
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore.stakeExecutor({ value: minExecutorStake });

      // provideFunds()
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.connect(provider).provideFunds(providerAddress, {
        value: minProviderStake,
      });

      // providerAssignsExecutor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      // otherExecutor tries to reassign executor's asssignment to self
      await expect(
        gelatoCore
          .connect(otherExecutor)
          .executorAssignsExecutor(providerAddress, otherExecutorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.executorAssignsExecutor: msg.sender is not assigned executor"
      );
    });

    it("Should NOT allow Executors to reassign to themselves", async function () {
      // stakeExecutor() (needed for executorAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore.stakeExecutor({ value: minExecutorStake });

      // stakeExecutor(): otherExecutor
      await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });

      // provideFunds()
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.connect(provider).provideFunds(providerAddress, {
        value: minProviderStake,
      });

      // providerAssignsExecutor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      // executorAssignsExecutor
      await expect(
        gelatoCore.executorAssignsExecutor(providerAddress, executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.executorAssignsExecutor: already assigned."
      );
    });

    it("Should NOT allow Executors to reassign to not-minStaked Executor", async function () {
      // stakeExecutor() (needed for executorAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore.stakeExecutor({ value: minExecutorStake });

      // provideFunds()
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.connect(provider).provideFunds(providerAddress, {
        value: minProviderStake,
      });

      // providerAssignsExecutor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      // executor tries to assign not-minStaked otherExecutor
      await expect(
        gelatoCore.executorAssignsExecutor(
          providerAddress,
          otherExecutorAddress
        )
      ).to.be.revertedWith(
        "GelatoProviders.executorAssignsExecutor: isExecutorMinStaked()"
      );
    });

    it("Should NOT allow Executors to reassign if Provider is not minStaked", async function () {
      // stakeExecutor() (needed for executorAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore.stakeExecutor({ value: minExecutorStake });

      // stakeExecutor(): otherExecutor
      await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });

      // provideFunds()
      const minProviderStake = await gelatoCore.minProviderStake();
      await gelatoCore.connect(provider).provideFunds(providerAddress, {
        value: minProviderStake,
      });

      // providerAssignsExecutor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);

      // increase minProviderStake (connected executor is Owner of GelatoCore)
      await gelatoCore.setMinProviderStake(minProviderStake + 1);

      // executor tries to assign otherExecutor to not (anymore) minStaked Provider
      await expect(
        gelatoCore.executorAssignsExecutor(
          providerAddress,
          otherExecutorAddress
        )
      ).to.be.revertedWith(
        "GelatoProviders.executorAssignsExecutor: isProviderMinStaked()"
      );
    });
  });
});
