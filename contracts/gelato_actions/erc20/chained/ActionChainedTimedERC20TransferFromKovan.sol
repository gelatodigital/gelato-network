pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { ActionERC20TransferFrom, ActionPayload as SuperActionPayload } from "../one_offs/ActionERC20TransferFrom.sol";
import { ExecClaim, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../IGelatoAction.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

struct ActionData { uint256 dueDate; uint256 timeOffset; }

contract ActionChainedTimedERC20TransferFromKovan is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using GelatoString for string;

    address public constant GELATO_CORE = 0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2;

    function action(bytes calldata _actionPayload) external payable override virtual {
        (SuperActionPayload memory superActionPayload,
         ActionData memory actionData,
         ExecClaim memory execClaim) = abi.decode(
             _actionPayload[4:],
             (SuperActionPayload,ActionData,ExecClaim)
         );
         action(superActionPayload, actionData, execClaim);
    }

    function action(
        SuperActionPayload memory _superActionPayload,
        ActionData memory _actionData,
        ExecClaim memory _ec
    )
        public
        payable
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        super.action(_superActionPayload);

        // Duedate for next chained action call
         _actionData.dueDate = _actionData.dueDate.add(_actionData.timeOffset);
         // Max 3 days delay, else automatic expiry
        _ec.task.expiryDate = _actionData.dueDate.add(3 days);

        // Encode updated ActionChainedTimedERC20TransferFromKovan payload into actionPayload
        // @DEV we could maybe use some assembly here to only swap the dueDateValue
        // _ec.task.actionPayload = abi.encodeWithSelector(
        //     IGelatoAction.action.selector,
        //     _superActionPayload,
        //     _actionData,
        //     _ec
        // );

        // // Mint: ExecClaim Chain continues with Updated Payloads
        // try IGelatoCore(GELATO_CORE).mintExecClaim(_ec.task) {
        // } catch Error(string memory error) {
        //     revert(
        //         string(abi.encodePacked(
        //             "ActionChainedTimedERC20TransferFromKovan.mintExecClaim",
        //             error
        //         ))
        //     );
        // } catch {
        //     revert("ActionChainedTimedERC20TransferFromKovan.mintExecClaim:undefined");
        // }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionPayload without Selector
        (SuperActionPayload memory superActionPayload,
         ActionData memory actionData,
         ExecClaim memory execClaim) = abi.decode(
             _actionPayload[4:],
             (SuperActionPayload,ActionData,ExecClaim)
        );

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory transferStatus = super.termsOk(superActionPayload);

        // If: Base actionTermsOk: NOT OK => Return
        if (transferStatus.startsWithOk()) return transferStatus;

        // Else: Check and Return current contract actionTermsOk
        return termsOk(actionData, execClaim);
    }

    function termsOk(ActionData memory _actionData, ExecClaim memory _ec)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {
        if (_actionData.dueDate >= block.timestamp)
            return "ActionChainedTimedERC20TransferFromKovan.termsOk: TimestampDidNotPass";

        GelatoCore gelatoCore = GelatoCore(GELATO_CORE);

        // Check ExecClaimExpiryDate maximum
        uint256 nextDueDate = _actionData.dueDate.add(_actionData.timeOffset);
        uint256 execClaimTenancy = gelatoCore.execClaimTenancy();

        if (nextDueDate > (now + execClaimTenancy))
            return "ActionChainedTimedERC20TransferFromKovan.termsOk: execClaimTenancy";

        if (_ec.userProxy != _ec.task.provider) {
            string memory isProvided = gelatoCore.isExecClaimProvided(
                _ec
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
        return "Ok";
    }
}
