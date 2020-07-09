// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoCore, TaskReceipt} from "../gelato_core/interfaces/IGelatoCore.sol";
import {IGelatoProviders} from "../gelato_core/interfaces/IGelatoProviders.sol";
import {IGelatoExecutors} from "../gelato_core/interfaces/IGelatoExecutors.sol";
import {IGelatoSysAdmin} from "../gelato_core/interfaces/IGelatoSysAdmin.sol";
import {Address} from  "../external/Address.sol";
import {GelatoTaskReceipt} from "../libraries/GelatoTaskReceipt.sol";
import {GelatoString} from "../libraries/GelatoString.sol";

/// @title PermissionedExecutors
/// @notice Contract that masks 2 known executor addresses behind one address
/// @author gitpusha & HilmarX
contract PermissionedExecutors {

    using Address for address payable;
    using GelatoTaskReceipt for TaskReceipt;
    using GelatoString for string;

    struct Reponse {
        uint256 taskReceiptId;
        uint256 taskGasLimit;
        string response;
    }

    address public immutable gelatoCore;
    address public constant first_executor = 0x4d671CD743027fB5Af1b2D2a3ccbafA97b5B1B80;
    address public constant second_executor = 0x99E69499973484a96639f4Fb17893BC96000b3b8;

    constructor(address _gelatoCore) public payable {
        gelatoCore = _gelatoCore;
        if (msg.value >= IGelatoSysAdmin(_gelatoCore).minExecutorStake())
            IGelatoExecutors(_gelatoCore).stakeExecutor{value: msg.value}();
    }

    /// @dev needed for unstaking/withdrawing from GelatoCore
    receive() external payable {
        require(msg.sender == gelatoCore, "PermissionedExecutors.receive");
    }

    modifier onlyExecutors {
        require(
            msg.sender == first_executor || msg.sender == second_executor,
            "PermissionedExecutors.onlyExecutor"
        );
        _;
    }

    function stakeExecutor() public payable virtual {
        IGelatoExecutors(gelatoCore).stakeExecutor{value: msg.value}();
    }

    function unstakeExecutor() public virtual onlyExecutors {
        uint256 stake = IGelatoProviders(gelatoCore).executorStake(address(this));
        IGelatoExecutors(gelatoCore).unstakeExecutor();
        msg.sender.sendValue(stake);
    }

    function withdrawExcessExecutorStake(uint256 _withdrawAmount)
        public
        payable
        virtual
        onlyExecutors
    {
        msg.sender.sendValue(
            IGelatoExecutors(gelatoCore).withdrawExcessExecutorStake(_withdrawAmount)
        );
    }

    /// @dev This aggregates results and saves network provider requests
    function multiCanExec(TaskReceipt[] memory _TRs, uint256 _gelatoGasPrice)
        public
        view
        virtual
        returns (uint256 blockNumber, Reponse[] memory responses)
    {
        blockNumber = block.number;
        uint256 gelatoMaxGas = IGelatoSysAdmin(gelatoCore).gelatoMaxGas();
        responses = new Reponse[](_TRs.length);
        for(uint256 i = 0; i < _TRs.length; i++) {
            uint256 taskGasLimit = getGasLimit(_TRs[i], gelatoMaxGas);
            try IGelatoCore(gelatoCore).canExec(
                _TRs[i],
                taskGasLimit,
                _gelatoGasPrice
            )
                returns(string memory response)
            {
                responses[i] = Reponse({
                    taskReceiptId: _TRs[i].id,
                    taskGasLimit: taskGasLimit,
                    response: response
                });
            } catch {
                responses[i] = Reponse({
                    taskReceiptId: _TRs[i].id,
                    taskGasLimit: taskGasLimit,
                    response: "PermissionedExecutors.multiCanExec: failed"
                });
            }
        }
    }

    /// @notice only the hardcoded Executors can call this
    /// @dev Caution: there is no built-in coordination mechanism between the 2
    /// Executors. Only one Executor should be live at all times, lest they
    /// will incur tx collision costs.
    function exec(TaskReceipt calldata _TR) public virtual onlyExecutors {
        try IGelatoCore(gelatoCore).exec(_TR) {
        } catch Error(string memory error) {
            error.revertWithInfo("PermissionedExecutors.exec:");
        } catch {
            revert("PermissionedExecutors.exec:unknown error");
        }
    }

    function multiReassignProviders(address[] calldata _providers, address _newExecutor)
        public
        virtual
        onlyExecutors
    {
        IGelatoExecutors(gelatoCore).multiReassignProviders(_providers, _newExecutor);
    }

    function getGasLimit(TaskReceipt memory _TR, uint256 _gelatoMaxGas)
        public
        pure
        virtual
        returns(uint256)
    {
        if (_TR.selfProvider()) return _TR.task().selfProviderGasLimit;
        return _gelatoMaxGas;
    }
}