pragma solidity ^0.6.2;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract ActionERC20Transfer is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 80000;

    function action(
        // Standard Action Params
        address,  // user
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount,
        // Specific Action Params
        address _destination
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "NotOkUserProxy");
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.transfer(_destination, _sendAmount) {
            emit LogOneWay(_userProxy, _sendToken, _sendAmount, _destination);
        } catch {
            revert("ActionERC20Transfer: ErrorTransfer");
        }
    }

    // ===== ACTION CONDITIONS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user,
         address _userProxy,
         address _sendToken,
         uint256 _sendAmount) = abi.decode(
            _actionPayloadWithSelector[4:132],
            (address,address,address,uint256)
        );
        return _actionConditionsCheck(_user, _userProxy, _sendToken, _sendAmount);
    }

    function _actionConditionsCheck(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _sendToken,
        uint256 _sendAmount
    )
        internal
        view
        virtual
        returns(string memory)  // // actionCondition
    {
        if (!_isUserOwnerOfUserProxy(_user, _userProxy))
            return "ActionERC20Transfer: NotOkUserProxyOwner";

        if (!_sendToken.isContract()) return "ActionERC20Transfer: NotOkERC20Address";

        IERC20 sendERC20 = IERC20(_sendToken);

        try sendERC20.balanceOf(_userProxy) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sendAmount)
                return "ActionERC20Transfer: NotOkUserProxyBalance";
        } catch {
            return "ActionERC20Transfer: ErrorBalanceOf";
        }
        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }

    // ============ API for FrontEnds ===========
    function getUserProxysSourceTokenBalance(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _sendToken,
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _user;  // silence warning
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_userProxy) returns(uint256 userProxySendERC20Balance) {
            return userProxySendERC20Balance;
        } catch {
            revert("Error: ActionERC20Transfer.getUserProxysSourceTokenBalance: balanceOf");
        }
    }
}
