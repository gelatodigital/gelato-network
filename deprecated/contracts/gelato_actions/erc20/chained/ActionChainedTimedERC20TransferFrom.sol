// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import { ActionERC20TransferFrom, ActionData as SuperActionData } from "../one_offs/ActionERC20TransferFrom.sol";
import { Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";

struct ActionData { uint256 dueDate; uint256 timeOffset; }

contract ActionChainedTimedERC20TransferFrom is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using GelatoString for string;

    GelatoCore public immutable gelatoCore;

    constructor(GelatoCore _gelatoCore) public { gelatoCore = _gelatoCore; }

    function chainedAction(
        SuperActionData memory _superActionData,
        ActionData memory _actionData,
        Task memory _task
    )
        public
        payable
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        action(_superActionData);

        // Duedate for next chained action call
         _actionData.dueDate = _actionData.dueDate.add(_actionData.timeOffset);
         // Max 3 days delay, else automatic expiry
        _task.expiryDate = _actionData.dueDate.add(3 days);

        // Encode updated ActionChainedTimedERC20TransferFromKovan payload into actionData
        // @DEV we could maybe use some assembly here to only swap the dueDateValue
        _task.actions[0].data = abi.encodeWithSelector(
            this.chainedAction.selector,
            _superActionData,
            _actionData,
            _task
        );

        // Submit:Task Chain continues with Updated Payloads
        try gelatoCore.submitTask(_task) {
        } catch Error(string memory error) {
            revert(
                string(abi.encodePacked(
                    "ActionChainedTimedERC20TransferFromKovan.submitTask",
                    error
                ))
            );
        } catch {
            revert("ActionChainedTimedERC20TransferFromKovan.submitTask:undefined");
        }
    }

    // ======= ACTION TERMS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionData without Selector
        (SuperActionData memory superActionData,
         ActionData memory actionData,
         Task memory task) = abi.decode(_actionData[4:], (SuperActionData,ActionData,Task));

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory transferStatus = termsOk(_userProxy, superActionData);

        // If: Base actionTermsOk: NOT OK => Return
        if (transferStatus.startsWithOk()) return transferStatus;

        // Else: Check and Return current contract actionTermsOk
        return termsOk(_userProxy, actionData, task);
    }

    function termsOk(address _userProxy, ActionData memory _actionData, Task memory _task)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {
        if (_actionData.dueDate >= block.timestamp)
            return "ActionChainedTimedERC20TransferFromKovan.termsOk: TimestampDidNotPass";

        if (_userProxy != _provider.addr) {
            string memory isProvided = gelatoCore.isTaskProvided(_userProxy, _task);
            if (!isProvided.startsWithOk()) {
                return string(
                    abi.encodePacked(
                        "ActionChainedTimedERC20TransferFromKovan.termsOk:", isProvided
                    )
                );
            }
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
