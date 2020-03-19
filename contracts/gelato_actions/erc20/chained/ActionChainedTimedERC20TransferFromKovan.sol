pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { ActionERC20TransferFrom, ActionPayload as SuperActionPayload } from "../one_offs/ActionERC20TransferFrom.sol";
import { ConditionTimestampPassed } from "../../../gelato_conditions/eth_utils/eth_time/ConditionTimestampPassed.sol";
import { ExecClaim, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoExecutors } from "../../../gelato_core/interfaces/IGelatoExecutors.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { Address } from "../../../external/Address.sol";

struct ActionData {
    address executor;
    uint256 dueDate;
    uint256 timeOffset;
}

contract ActionChainedTimedERC20TransferFromKovan is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using Address for address;

    address public constant GELATO_CORE = 0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2;

    // ActionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return this.chainedAction.selector;
    }

    function chainedAction(
        SuperActionPayload memory _superActionPayload,
        ActionData memory _actionData,
        ExecClaim memory _execClaim
    )
        public
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        action(_superActionPayload);

        // Duedate for next chained action call
         _actionData.dueDate = _actionData.dueDate.add(_actionData.timeOffset);
         // Max 3 days delay, else automatic expiry
        _execClaim.expiryDate = _actionData.dueDate.add(3 days);

        // Encode: updated ActionChainedTimedERC20TransferFromKovan payload
        // @DEV we could maybe use some assembly here to only swap the dueDateValue
        // @DEV we need to check whether we actually need to update _execClaim.execPayload
        _execClaim.actionPayload = abi.encodeWithSelector(
            actionSelector(),
            _superActionPayload,
            _actionData,
            _execClaim
        );

        // Mint: ExecClaim Chain continues with Updated Payloads
        IGelatoCore(GELATO_CORE).mintExecClaim(_actionData.executor, _execClaim);
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function ok(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        // Decode: Calldata Array execPayload without Selector
        (SuperActionPayload memory _superActionPayload,
         ActionData memory _actionData,
         ExecClaim memory _execClaim) = abi.decode(
             _actionPayload[4:],
             (SuperActionPayload,ActionData,ExecClaim)
        );

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory baseActionCondition = _actionConditionsCheck(_superActionPayload);

        // If: Base actionCondition: NOT OK => Return
        if (
            bytes(baseActionCondition).length >= 2 &&
            bytes(baseActionCondition)[0] != "o"
            && bytes(baseActionCondition)[1] != "k"
        )
            return baseActionCondition;

        // Else: Check and Return current contract actionCondition
        return _actionConditionsCheck(_actionData, _execClaim);
    }

    function _actionConditionsCheck(
        ActionData memory _actionData,
        ExecClaim memory _execClaim
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        _execClaim;  // no checks for now
        if (_actionData.dueDate >= block.timestamp) return "NotOkTimestampDidNotPass";

        // Check ExecClaimExpiryDate maximum
        uint256 nextDueDate = _actionData.dueDate.add(_actionData.timeOffset);
        uint256 executorClaimLifespan = IGelatoExecutors(GELATO_CORE).executorClaimLifespan(
            _actionData.executor
        );

        if (nextDueDate > (now + executorClaimLifespan))
            return "ActionChainedTimedERC20TransferFromKovan._actionConditionsCheck: exp";

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }
}
