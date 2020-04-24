// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoExecutors creation time variable values
import initialState from "./GelatoExecutors.initialState";

describe("GelatoCore - GelatoExecutors - Setters: FUNDS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;

  let executor;
  let otherExecutor;
  let provider;
  let otherProvider;

  let executorAddress;
  let otherExecutorAddress;
  let providerAddress;
  let otherProviderAddress;

  let minExecutorStake;

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

    executorAddress = await executor.getAddress();
    otherExecutorAddress = await otherExecutor.getAddress();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();

    minExecutorStake = await gelatoCore.minExecutorStake();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // stakeExecutor
  describe("GelatoCore.GelatoExecutors.stakeExecutor", function () {
    it("Should allow anyone to stakeExecutor with minExecutorStake", async function () {
      // executorBalance
      const executorBalanceBefore = await executor.getBalance();
      // gelatoCoreBalance
      const gelatoCoreBalanceBefore = await ethers.provider.getBalance(
        gelatoCore.address
      );

      // stakeExecutor(): executor
      await expect(gelatoCore.stakeExecutor({ value: minExecutorStake }))
        .to.emit(gelatoCore, "LogExecutorStaked")
        .withArgs(executorAddress, minExecutorStake);

      // executorBalance
      expect(await executor.getBalance()).to.be.below(executorBalanceBefore);
      // gelatoCoreBalance
      expect(await ethers.provider.getBalance(gelatoCore.address)).to.equal(
        gelatoCoreBalanceBefore.add(minExecutorStake)
      );
      // executorStake: executor
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake
      );

      // stakeExecutor(): otherExecutor
      await expect(
        gelatoCore
          .connect(otherExecutor)
          .stakeExecutor({ value: minExecutorStake.add(69) })
      )
        .to.emit(gelatoCore, "LogExecutorStaked")
        .withArgs(otherExecutorAddress, minExecutorStake.add(69));

      // executorStake: otherExecutor
      expect(await gelatoCore.executorStake(otherExecutorAddress)).to.be.equal(
        minExecutorStake.add(69)
      );
    });

    it("Should NOT allow already staked executors to stake", async function () {
      // stakeExecutor(): executor
      const tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      await expect(
        gelatoCore.stakeExecutor({ value: minExecutorStake })
      ).to.be.revertedWith("GelatoExecutors.stakeExecutor: already registered");
    });

    it("Should NOT allow executors to stake less than minExecutorStake", async function () {
      await expect(
        gelatoCore.stakeExecutor({ value: minExecutorStake.sub(1) })
      ).to.be.revertedWith("GelatoExecutors.stakeExecutor: minExecutorStake");
    });
  });

  // unstakeExecutor
  describe("GelatoCore.GelatoExecutors.unstakeExecutor", function () {
    it("Should allow Executors to unstake", async function () {
      // stakeExecutor
      let tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // executorBalance
      const executorBalanceBefore = await executor.getBalance();
      // gelatoCoreBalance
      const gelatoCoreBalanceBefore = await ethers.provider.getBalance(
        gelatoCore.address
      );

      // unstakeExecutor()
      await expect(gelatoCore.unstakeExecutor())
        .to.emit(gelatoCore, "LogExecutorUnstaked")
        .withArgs(executorAddress);

      // executorBalance
      expect(await executor.getBalance()).to.be.above(executorBalanceBefore);
      // gelatoCoreBalance
      expect(await ethers.provider.getBalance(gelatoCore.address)).to.equal(
        gelatoCoreBalanceBefore.sub(minExecutorStake)
      );
      // executorStake
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(0);

      // otherExecutor: stakeExecutor
      tx = await gelatoCore.connect(otherExecutor).stakeExecutor({
        value: minExecutorStake.add(69),
      });
      await tx.wait();

      // otherExecutor: unstakeExecutor
      await expect(gelatoCore.connect(otherExecutor).unstakeExecutor())
        .to.emit(gelatoCore, "LogExecutorUnstaked")
        .withArgs(otherExecutorAddress);
      expect(await gelatoCore.executorStake(otherExecutorAddress)).to.be.equal(
        0
      );
    });

    it("Should NOT allow not-minStaked Executors to unstake", async function () {
      await expect(gelatoCore.unstakeExecutor()).to.be.revertedWith(
        "GelatoExecutors.unstakeExecutor: already unstaked"
      );

      // stakeExecutor
      let tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // unstakeExecutor
      tx = await gelatoCore.unstakeExecutor();
      await tx.wait();

      await expect(gelatoCore.unstakeExecutor()).to.be.revertedWith(
        "GelatoExecutors.unstakeExecutor: already unstaked"
      );
    });

    it("Should NOT allow assigned Executors to unstake", async function () {
      // stakeExecutor
      let tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // providerAssignsExecutor: executor
      tx = await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);
      await tx.wait();

      // unstakeExecutor
      await expect(gelatoCore.unstakeExecutor()).to.be.revertedWith(
        "GelatoExecutors.unstakeExecutor: msg.sender still assigned"
      );

      // provider unassigns executor
      await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(constants.AddressZero);

      // unstakeExecutor
      await expect(gelatoCore.unstakeExecutor())
        .to.emit(gelatoCore, "LogExecutorUnstaked")
        .withArgs(executorAddress);

      // executorStake
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(0);
    });
  });

  // increaseExecutorStake
  describe("GelatoCore.GelatoExecutors.increaseExecutorStake", function () {
    it("Should allow Executors to increaseExecutorStake", async function () {
      // stakeExecutor(): executor
      let tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // executorBalance
      const executorBalanceBefore = await executor.getBalance();
      // gelatoCoreBalance
      const gelatoCoreBalanceBefore = await ethers.provider.getBalance(
        gelatoCore.address
      );

      // increaseExecutorStake(): executor
      await expect(
        gelatoCore.increaseExecutorStake({ value: utils.parseEther("1") })
      )
        .to.emit(gelatoCore, "LogExecutorStakeIncreased")
        .withArgs(executorAddress, minExecutorStake.add(utils.parseEther("1")));

      // executorBalance
      expect(await executor.getBalance()).to.be.below(executorBalanceBefore);
      // gelatoCoreBalance
      expect(await ethers.provider.getBalance(gelatoCore.address)).to.equal(
        gelatoCoreBalanceBefore.add(utils.parseEther("1"))
      );
      // executorStake: executor
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake.add(utils.parseEther("1"))
      );
    });

    it("Should NOT allow not-staked Executors to increase stake", async function () {
      await expect(
        gelatoCore.increaseExecutorStake({ value: minExecutorStake })
      ).to.be.revertedWith("GelatoExecutors.increaseExecutorStake: no stake");
    });

    it("Should NOT allow Executors Stake to be below minExecutorStake after increase", async function () {
      // stakeExecutor(): executor
      let tx = await gelatoCore.stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // setMinExecutorStake
      tx = await gelatoCore.setMinExecutorStake(minExecutorStake.add(420));
      await tx.wait();

      // increaseExecutorStake: revert
      await expect(
        gelatoCore.increaseExecutorStake({ value: 69 })
      ).to.be.revertedWith(
        "GelatoExecutors.increaseExecutorStake: below minStake"
      );
    });
  });

  // withdrawExcessExecutorStake
  describe("GelatoCore.GelatoExecutors.withdrawExcessExecutorStake", function () {
    it("Should allow Executors to withdrawExcessExecutorStake", async function () {
      // stakeExecutor(): executor
      let tx = await gelatoCore.stakeExecutor({
        value: minExecutorStake,
      });
      await tx.wait();

      // increaseExecutorStake(): executor
      tx = await gelatoCore.increaseExecutorStake({
        value: utils.parseEther("1"),
      });
      await tx.wait();

      // executorBalance
      const executorBalanceBefore = await executor.getBalance();
      // gelatoCoreBalance
      const gelatoCoreBalanceBefore = await ethers.provider.getBalance(
        gelatoCore.address
      );

      // withdrawExcessExecutorStake
      await expect(
        gelatoCore.withdrawExcessExecutorStake(utils.parseEther("0.5"))
      )
        .to.emit(gelatoCore, "LogExecutorBalanceWithdrawn")
        .withArgs(executorAddress, utils.parseEther("0.5"));

      // executorBalance
      expect(await executor.getBalance()).to.be.above(executorBalanceBefore);
      // gelatoCoreBalance
      expect(await ethers.provider.getBalance(gelatoCore.address)).to.equal(
        gelatoCoreBalanceBefore.sub(utils.parseEther("0.5"))
      );
      // executorStake: executor
      expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
        minExecutorStake.add(utils.parseEther("1")).sub(utils.parseEther("0.5"))
      );
    });

    it("Should NOT allow not-staked Executors to withdrawExcessExecutorStake", async function () {
      await expect(
        gelatoCore.withdrawExcessExecutorStake(utils.parseEther("1"))
      ).to.be.revertedWith(
        "GelatoExecutors.withdrawExcessExecutorStake: not minStaked"
      );
    });
  });

  // withdrawExcessExecutorStake
  describe("GelatoCore.GelatoExecutors.multiReassignProviders", function () {
    it("Should allow Executors to multiReassignProviders", async function () {
      // stakeExecutor(): executor
      let tx = await gelatoCore.stakeExecutor({
        value: minExecutorStake,
      });
      await tx.wait();

      // stakeExecutor(): otherExecutor
      tx = await gelatoCore.connect(otherExecutor).stakeExecutor({
        value: minExecutorStake,
      });
      await tx.wait();

      // providerAssignsExecutor: executor
      tx = await gelatoCore
        .connect(provider)
        .providerAssignsExecutor(executorAddress);
      await tx.wait();

      // otherProvider assignsExecutor: executor
      tx = await gelatoCore
        .connect(otherProvider)
        .providerAssignsExecutor(executorAddress);
      await tx.wait();

      // executorProvidersCount
      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // otherExecutor providersCount
      const otherExecutorProvidersCount = await gelatoCore.executorProvidersCount(
        otherExecutorAddress
      );

      // multiReassignProviders
      await expect(
        gelatoCore.multiReassignProviders(
          [providerAddress, otherProviderAddress],
          otherExecutorAddress
        )
      )
        .to.emit(gelatoCore, "LogExecutorAssignedExecutor")
        .withArgs(providerAddress, executorAddress, otherExecutorAddress)
        .and.to.emit(gelatoCore, "LogExecutorAssignedExecutor")
        .withArgs(otherProviderAddress, executorAddress, otherExecutorAddress);

      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        otherExecutorAddress
      );
      // executorByProvider(otherProvider)
      expect(
        await gelatoCore.executorByProvider(otherProviderAddress)
      ).to.be.equal(otherExecutorAddress);

      // executorProvidersCount(executor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount - 2);
      // executorProvidersCount(otherExecutor)
      expect(
        await gelatoCore.executorProvidersCount(otherExecutorAddress)
      ).to.be.equal(otherExecutorProvidersCount + 2);
    });
  });
});
