pragma solidity ^0.6.0;

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
        address _user,
        address _userProxy,
        // Specific Action Params
        address _src,
        uint256 _srcAmt,
        address _beneficiary
    )
        external
        virtual
    {
        require(
            _isUserOwnerOfUserProxy(_user, _userProxy),
            "ActionERC20Transfer: NotOkUserProxyOwner"
        );
        require(address(this) == _userProxy, "ActionERC20Transfer: NotOkUserProxy");
        IERC20 srcERC20 = IERC20(_src);
        try srcERC20.transfer(_beneficiary, _srcAmt) {} catch {
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
        return _actionConditionsCheck(_actionPayloadWithSelector);
    }

    function _actionConditionsCheck(bytes memory _actionPayloadWithSelector)
        internal
        view
        virtual
        returns(string memory)  // // actionCondition
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (address _user, address _userProxy, address _src, uint256 _srcAmt,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if (!_isUserOwnerOfUserProxy(_user, _userProxy))
            return "ActionERC20Transfer: NotOkUserProxyOwner";

        if (!_src.isContract()) return "ActionERC20Transfer: NotOkERC20Address";

        IERC20 srcERC20 = IERC20(_src);

        try srcERC20.balanceOf(_userProxy) returns(uint256 srcBalance) {
            if (srcBalance < _srcAmt) return "ActionERC20Transfer: NotOkUserProxyBalance";
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
        address _src,
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _user;  // silence warning
        IERC20 srcERC20 = IERC20(_src);
        try srcERC20.balanceOf(_userProxy) returns(uint256 userProxySrcBalance) {
            return userProxySrcBalance;
        } catch {
            revert("Error: ActionERC20Transfer.getUserProxysSourceTokenBalance: balanceOf");
        }
    }
}
