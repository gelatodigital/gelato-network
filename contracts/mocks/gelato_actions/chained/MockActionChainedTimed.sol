pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";
import { ExecClaim, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../../gelato_actions/IGelatoAction.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

struct ActionData { uint256 dueDate; uint256 timeOffset; }

contract MockActionChainedTimed is GelatoActionsStandard {
    using SafeMath for uint256;
    using GelatoString for string;

    function action(bytes calldata _actionPayload) external payable override virtual {
        (ActionData memory actionData,
         ExecClaim memory execClaim,
         GelatoCore gelatoCore) = abi.decode(
            _actionPayload[4:],
            (ActionData,ExecClaim,GelatoCore)
        );
        action(actionData, execClaim, gelatoCore);
    }

    function action(
        ActionData memory _actionData,
        ExecClaim memory _execClaim,
        GelatoCore _gelatoCore
    )
        public
        payable
        virtual
    {
        // Duedate for next chained action call
        _actionData.dueDate = _actionData.dueDate.add(_actionData.timeOffset);
         // Max 3 days delay, else automatic expiry
        _execClaim.expiryDate = _actionData.dueDate.add(3 days);

        // Encode updated MockActionChainedTimed payload into actionPayload
        // @DEV we could maybe use some assembly here to only swap the dueDateValue
        _execClaim.actionPayload = abi.encodeWithSelector(
            IGelatoAction.action.selector,
            _actionData,
            _execClaim
        );

        // Mint: ExecClaim Chain continues with Updated Payloads
        try _gelatoCore.mintExecClaim(_execClaim, address(0)) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("MockActionChainedTimed.mintExecClaim", error)));
        } catch {
            revert("MockActionChainedTimed:undefined");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function ok(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionPayload without Selector
        (ActionData memory actionData,
         ExecClaim memory execClaim,
         GelatoCore gelatoCore) = abi.decode(
            _actionPayload[4:],
            (ActionData,ExecClaim,GelatoCore)
        );

        // Else: Check and Return current contract actionCondition
        return ok(actionData, execClaim, gelatoCore);
    }

    function ok(
        ActionData memory _actionData,
        ExecClaim memory _execClaim,
        GelatoCore _gelatoCore
    )
        public
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if (_actionData.dueDate >= block.timestamp)
            return "MockActionChainedTimed.ok: TimestampDidNotPass";

        address executor = _gelatoCore.providerExecutor(_execClaim.provider);

        // Check fee factors
        uint256 executorSuccessFeeFactor = _gelatoCore.executorSuccessFeeFactor(executor);
        if (_execClaim.executorSuccessFeeFactor != executorSuccessFeeFactor)
            return "MockActionChainedTimed.ok: executorSuccessFeeFactor";

        uint256 oracleSuccessFeeFactor = _gelatoCore.oracleSuccessFeeFactor();
        if (_execClaim.oracleSuccessFeeFactor != oracleSuccessFeeFactor)
            return "MockActionChainedTimed.ok: oracleSuccessFeeFactor";

        // Check ExecClaimExpiryDate maximum
        uint256 nextDueDate = _actionData.dueDate.add(_actionData.timeOffset);
        uint256 executorClaimLifespan = _gelatoCore.executorClaimLifespan(
            executor
        );
        if (nextDueDate > (now + executorClaimLifespan))
            return "MockActionChainedTimed.ok: executorClaimLifespan";

        uint256 gelatoGasPrice = _gelatoCore.gelatoGasPrice();

        if (_execClaim.user != _execClaim.provider) {
            string memory isProvided = _gelatoCore.isProvided(_execClaim, gelatoGasPrice);
            if (!isProvided.startsWithOk()) {
                return string(
                    abi.encodePacked(
                        "MockActionChainedTimed.ok:", isProvided
                    )
                );
            }
        }

        // STANDARD return string to signal actionConditions Ok
        return "Ok";
    }
}
