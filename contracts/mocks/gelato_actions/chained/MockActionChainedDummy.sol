pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";
import { TaskReceipt, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

contract MockActionChainedDummy is GelatoActionsStandard {
    using GelatoString for string;

    function action(TaskReceipt memory _TR, GelatoCore _gelatoCore)
        public
        payable
        virtual
    {
        // Submit:TaskReceipt Chain continues with Updated Payloads
        try _gelatoCore.submitTask(_TR.task) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("MockActionChainedDummy.submitTask", error)));
        } catch {
            revert("MockActionChainedDummy:undefined");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData, address _userProxy)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionData without Selector
        (TaskReceipt memory taskReceipt, GelatoCore gelatoCore) = abi.decode(
            _actionData[4:],
            (TaskReceipt,GelatoCore)
        );

        // Else: Check and Return current contract actionTermsOk
        return termsOk(taskReceipt, gelatoCore, _userProxy);
    }

    function termsOk(TaskReceipt memory _TR, GelatoCore _gelatoCore, address _userProxy)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {

        if (_userProxy != _TR.task.provider.addr) {
            string memory isProvided = _gelatoCore.isTaskProvided(
                _TR
            );
            if (!isProvided.startsWithOk()) {
                return string(
                    abi.encodePacked(
                        "MockActionChainedDummy.termsOk:", isProvided
                    )
                );
            }
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
