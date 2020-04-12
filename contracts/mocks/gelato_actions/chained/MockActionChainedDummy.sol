pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";
import { ExecClaim, IGelatoCore } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import { GelatoString } from "../../../libraries/GelatoString.sol";
import { GelatoCore } from "../../../gelato_core/GelatoCore.sol";

contract MockActionChainedDummy is GelatoActionsStandard {
    using GelatoString for string;

    function action(bytes calldata _actionPayload) external payable override virtual {
        (ExecClaim memory execClaim, GelatoCore gelatoCore) = abi.decode(
            _actionPayload[4:],
            (ExecClaim,GelatoCore)
        );
        action(execClaim, gelatoCore);
    }

    function action(ExecClaim memory _ec, GelatoCore _gelatoCore)
        public
        payable
        virtual
    {
        // Mint: ExecClaim Chain continues with Updated Payloads
        try _gelatoCore.mintExecClaim(_ec.task) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("MockActionChainedDummy.mintExecClaim", error)));
        } catch {
            revert("MockActionChainedDummy:undefined");
        }
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
        (ExecClaim memory execClaim, GelatoCore gelatoCore) = abi.decode(
            _actionPayload[4:],
            (ExecClaim,GelatoCore)
        );

        // Else: Check and Return current contract actionTermsOk
        return termsOk(execClaim, gelatoCore);
    }

    function termsOk(ExecClaim memory _ec, GelatoCore _gelatoCore)
        public
        view
        virtual
        returns(string memory)  // actionTermsOk
    {

        if (_ec.userProxy != _ec.task.provider.addr) {
            string memory isProvided = _gelatoCore.isExecClaimProvided(
                _ec
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
        return "Ok";
    }
}
