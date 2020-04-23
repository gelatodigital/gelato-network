pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { ActionERC20TransferFrom, ActionData as SuperActionData } from "../one_offs/ActionERC20TransferFrom.sol";
import { TaskReceipt, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../IGelatoAction.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

struct ActionData { uint256 dueDate; uint256 timeOffset; }

contract ActionChainedTimedERC20TransferFromKovan is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using GelatoString for string;

    address public constant GELATO_CORE = 0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2;

    function action(bytes calldata _actionData) external payable override virtual {
        (SuperActionData memory superActionData,
         ActionData memory actionData,
         TaskReceipt memory taskReceipt) = abi.decode(
             _actionData[4:],
             (SuperActionData,ActionData,TaskReceipt)
         );
         action(superActionData, actionData, taskReceipt);
    }

    function action(
        SuperActionData memory _superActionData,
        ActionData memory _actionData,
        TaskReceipt memory _TR
    )
        public
        payable
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        super.action(_superActionData);

        // Duedate for next chained action call
         _actionData.dueDate = _actionData.dueDate.add(_actionData.timeOffset);
         // Max 3 days delay, else automatic expiry
        _TR.task.expiryDate = _actionData.dueDate.add(3 days);

        // Encode updated ActionChainedTimedERC20TransferFromKovan payload into actionData
        // @DEV we could maybe use some assembly here to only swap the dueDateValue
        // _TR.task.actionData = abi.encodeWithSelector(
        //     IGelatoAction.action.selector,
        //     _superActionData,
        //     _actionData,
        //     _TR
        // );

        // // Submit:TaskReceipt Chain continues with Updated Payloads
        // try IGelatoCore(GELATO_CORE).submitTask(_TR.task) {
        // } catch Error(string memory error) {
        //     revert(
        //         string(abi.encodePacked(
        //             "ActionChainedTimedERC20TransferFromKovan.submitTask",
        //             error
        //         ))
        //     );
        // } catch {
        //     revert("ActionChainedTimedERC20TransferFromKovan.submitTask:undefined");
        // }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionData without Selector
        (SuperActionData memory superActionData,
         ActionData memory actionData,
         TaskReceipt memory taskReceipt) = abi.decode(
             _actionData[4:],
             (SuperActionData,ActionData,TaskReceipt)
        );

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory transferStatus = super.termsOk(superActionData);

        // If: Base actionTermsOk: NOT OK => Return
        if (transferStatus.startsWithOk()) return transferStatus;

        // Else: Check and Return current contract actionTermsOk
        return termsOk(actionData, taskReceipt);
    }

    function termsOk(ActionData memory _actionData, TaskReceipt memory _TR)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {
        if (_actionData.dueDate >= block.timestamp)
            return "ActionChainedTimedERC20TransferFromKovan.termsOk: TimestampDidNotPass";

        GelatoCore gelatoCore = GelatoCore(GELATO_CORE);

        if (_TR.userProxy != _TR.task.provider.addr) {
            string memory isProvided = gelatoCore.isTaskReceiptProvided(
                _TR
            );
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
