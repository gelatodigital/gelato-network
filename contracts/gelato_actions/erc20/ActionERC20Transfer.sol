pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";

struct ActionData {
    address sendToken;
    uint256 sendAmount;
    address destination;
}

/// @dev This action does not abide by GelatoActionsStandard because
///      this action is for user proxies that store funds.
contract ActionERC20Transfer is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;

    function action(ActionData memory _d) public payable virtual {
        IERC20 sendERC20 = IERC20(_d.sendToken);
        try sendERC20.transfer(_d.destination, _d.sendAmount) {
            emit LogOneWay(address(this), _d.sendToken, _d.sendAmount, _d.destination);
        } catch {
            revert("ActionERC20Transfer: ErrorTransfer");
        }
    }

    // ===== ACTION CONDITIONS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (ActionData memory _d) = abi.decode(_actionData[4:], (ActionData));
        return termsOk(_userProxy, _d);
    }

    function termsOk(address _userProxy, ActionData memory _d) public view virtual returns(string memory)  {
        if (!_d.sendToken.isContract()) return "ActionERC20Transfer: NotOkERC20Address";

        IERC20 sendERC20 = IERC20(_d.sendToken);

        try sendERC20.balanceOf(_userProxy) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _d.sendAmount)
                return "ActionERC20Transfer: NotOkUserProxyBalance";
        } catch {
            return "ActionERC20Transfer: ErrorBalanceOf";
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
