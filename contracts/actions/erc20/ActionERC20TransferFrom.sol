pragma solidity ^0.6.2;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract ActionERC20TransferFrom is GelatoActionsStandard {
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
        address _user,
        address _userProxy,
        // Specific Action Params
        address _sendToken,
        uint256 _sendAmount,
        address _destination
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ErrorUserProxy");
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.transferFrom(_user, _destination, _sendAmount) {
            emit LogOneWay(_user, _sendToken, _sendAmount, _destination);
        } catch {
            revert("ErrorTransferFromUser");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
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
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if (!_isUserOwnerOfUserProxy(_user, _userProxy))
            return "ActionERC20Transfer: NotOkUserProxyOwner";

        if (!_sendToken.isContract()) return "ActionERC20TransferFrom: NotOkSrcAddress";

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sendAmount) return "ActionERC20TransferFrom: NotOkUserBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, _userProxy) returns(uint256 userProxySendTokenAllowance) {
            if (userProxySendTokenAllowance < _sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }

    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
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
        _userProxy;  // silence warning
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 sendERC20Balance) {
            return sendERC20Balance;
        } catch {
            revert("Error: ActionERC20TransferFrom.getUsersSendTokenBalance: balanceOf");
        }
    }
}
