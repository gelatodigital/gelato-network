pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { IERC20 } from "../../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import { Address } from "../../../external/Address.sol";

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

    function action(bytes calldata _actionData) external payable override virtual {
        (ActionData memory _p) = abi.decode(_actionData[4:], (ActionData));
         action(_p);
    }

    function action(ActionData memory _p) public payable virtual {
        IERC20 sendERC20 = IERC20(_p.sendToken);
        try sendERC20.transfer(_p.destination, _p.sendAmount) {
            emit LogOneWay(address(this), _p.sendToken, _p.sendAmount, _p.destination);
        } catch {
            revert("ActionERC20Transfer: ErrorTransfer");
        }
    }

    // ===== ACTION CONDITIONS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData, address _userProxy)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (ActionData memory _p) = abi.decode(_actionData[4:], (ActionData));
        return termsOk(_p, _userProxy);
    }

    function termsOk(ActionData memory _p, address _userProxy) public view virtual returns(string memory)  {
        if (!_p.sendToken.isContract()) return "ActionERC20Transfer: NotOkERC20Address";

        IERC20 sendERC20 = IERC20(_p.sendToken);

        try sendERC20.balanceOf(_userProxy) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _p.sendAmount)
                return "ActionERC20Transfer: NotOkUserProxyBalance";
        } catch {
            return "ActionERC20Transfer: ErrorBalanceOf";
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
