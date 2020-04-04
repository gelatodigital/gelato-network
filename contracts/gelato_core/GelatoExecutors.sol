pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoExecutors } from "./interfaces/IGelatoExecutors.sol";
import { GelatoProviders } from "./GelatoProviders.sol";
import { Address } from  "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";

abstract contract GelatoExecutors is IGelatoExecutors, GelatoProviders {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    mapping(address => uint256) public override executorFunds;

    // Executor De/Registrations and Staking
    function stakeExecutor() external payable override {
        require(
            executorStake[msg.sender] == 0,
            "GelatoExecutors.stakeExecutor: already registered"
        );
        require(
            msg.value >= minExecutorStake,
            "GelatoExecutors.stakeExecutor: minExecutorStake"
        );
        executorStake[msg.sender] = msg.value;
        emit LogStakeExecutor(msg.sender, msg.value);
    }

    function unstakeExecutor() external override {
        require(
            isExecutorMinStaked(msg.sender),
            "GelatoExecutors.unstakeExecutor: msg.sender is NOT min staked"
        );
        require(
            !isExecutorAssigned(msg.sender),
            "GelatoExecutors.unstakeExecutor: msg.sender still assigned to provider(s)"
        );
        uint256 unbondedStake = executorStake[msg.sender];
        delete executorStake[msg.sender];
        msg.sender.sendValue(unbondedStake);
        emit LogUnstakeExecutor(msg.sender);
    }

    // @DEV why would anyone increase their stake? Only reason is to showcase that they are a serious executor, however
    // this would only be valid if this "excess" stake would be non-withdrawable, similiar to the minStake.
    function increaseExecutorStake(uint256 _topUpAmount) external payable override {
        executorStake[msg.sender] = executorStake[msg.sender].add(_topUpAmount);
        require(isExecutorMinStaked(msg.sender), "GelatoExecutors.increaseExecutorStake");
        emit LogIncreaseExecutorStake(msg.sender, executorStake[msg.sender]);
    }

    // To unstake, Executors must reassign ALL their Providers to another staked Executor
    function batchReassignProviders(address[] calldata _providers, address _transferExecutor)
        external
        override
    {
        for (uint i; i < _providers.length; i++)
            executorAssignsExecutor(_providers[i], _transferExecutor);
    }

    // Executor Accounting
    function withdrawExecutorBalance(uint256 _withdrawAmount)
        external
        override
        returns(uint256 realWithdrawAmount)
    {
        uint256 currentExecutorBalance = executorFunds[msg.sender];

        realWithdrawAmount = Math.min(_withdrawAmount, currentExecutorBalance);

        uint256 newExecutorFunds = currentExecutorBalance - realWithdrawAmount;

        // Effects
        executorFunds[msg.sender] = newExecutorFunds;

        // Interaction
        msg.sender.sendValue(realWithdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, realWithdrawAmount);
    }
}