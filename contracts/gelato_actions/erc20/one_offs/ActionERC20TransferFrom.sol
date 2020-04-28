pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { IERC20 } from "../../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import { Address } from "../../../external/Address.sol";

struct ActionData {
    address user;
    address sendToken;
    address destination;
    uint256 sendAmount;
}

contract ActionERC20TransferFrom is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;

    function action(ActionData memory _d) public payable virtual {
        IERC20 sendERC20 = IERC20(_d.sendToken);
        try sendERC20.transferFrom(_d.user, _d.destination, _d.sendAmount) {
            emit LogOneWay(_d.user, _d.sendToken, _d.sendAmount, _d.destination);
        } catch {
            revert("ActionERC20TransferFrom: ErrorTransferFromUser");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (ActionData memory _d) = abi.decode(_actionData[4:], (ActionData));
        return termsOk(_userProxy, _d);
    }

    function termsOk(address _userProxy, ActionData memory _d)
        public
        view
        virtual
        returns(string memory)
    {
        if (!_d.sendToken.isContract())
            return "ActionERC20TransferFrom: NotOkSendTokenAddress";

        IERC20 sendERC20 = IERC20(_d.sendToken);
        try sendERC20.balanceOf(_d.user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _d.sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }

        try sendERC20.allowance(_d.user, _userProxy) returns(uint256 allowance) {
            if (allowance < _d.sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        return OK;
    }
}
