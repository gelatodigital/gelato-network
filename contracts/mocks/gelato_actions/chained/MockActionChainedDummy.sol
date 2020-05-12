pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";
import { Task, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

contract MockActionChainedDummy is GelatoActionsStandard {
    using GelatoString for string;

    GelatoCore public immutable gelatoCore;

    constructor(GelatoCore _gelatoCore) public { gelatoCore = _gelatoCore; }

    function action(Task memory _task, uint256 _expiryDate, uint256 _rounds)
        public
        payable
        virtual
    {
        // Submit:Task Chain continues with Updated Payloads
        try gelatoCore.submitTask(_task, _expiryDate, _rounds) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("MockActionChainedDummy.submitTask", error)));
        } catch {
            revert("MockActionChainedDummy:undefined");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        // Decode: Calldata Array actionData without Selector
        (Task memory task, , ) = abi.decode(_actionData[4:], (Task, uint256, uint256));

        // Else: Check and Return current contract actionTermsOk
        return termsOk(_userProxy, task);
    }

    function termsOk(address _userProxy, Task memory _task)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {
        if (_userProxy != _task.provider.addr) {
            string memory isProvided = gelatoCore.isTaskProvided(_userProxy, _task);
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
