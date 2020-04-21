pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { IERC20 } from "../../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import { Address } from "../../../external/Address.sol";

struct ActionData {
    address user;
    address userProxy;
    address sendToken;
    address destination;
    uint256 sendAmount;
}

contract ActionERC20TransferFrom is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;

    function action(bytes calldata _actionData) external payable override virtual {
        (ActionData memory _p) = abi.decode(_actionData, (ActionData));
         action(_p);
    }

    function action(ActionData memory _p) public payable virtual {
        require(address(this) == _p.userProxy, "ActionERC20TransferFrom: UserProxy");
        IERC20 sendERC20 = IERC20(_p.sendToken);
        try sendERC20.transferFrom(_p.user, _p.destination, _p.sendAmount) {
            emit LogOneWay(_p.user, _p.sendToken, _p.sendAmount, _p.destination);
        } catch {
            revert("ActionERC20TransferFrom: ErrorTransferFromUser");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (ActionData memory _p) = abi.decode(_actionData[4:], (ActionData));
        return termsOk(_p);
    }

    function termsOk(ActionData memory _p) public view virtual returns(string memory) {
        if (!_p.sendToken.isContract())
            return "ActionERC20TransferFrom: NotOkSendTokenAddress";

        IERC20 sendERC20 = IERC20(_p.sendToken);
        try sendERC20.balanceOf(_p.user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _p.sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }
        try sendERC20.allowance(_p.user, _p.userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _p.sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
