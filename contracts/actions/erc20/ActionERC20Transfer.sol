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
        IERC20 _src,
        uint256 _srcAmt,
        address _beneficiary
    )
        external
    {
        try _src.transfer(_beneficiary, _srcAmt) {} catch {
            revert("ActionERC20Transfer: ErrorTransfer");
        }
    }

    // ============ API for FrontEnds ===========
    function getUsersSourceTokenBalance(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(uint256)
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );
        (address _user, address _userProxy, address _src,,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );
        IERC20 srcERC20 = IERC20(_src);
        try srcERC20.balanceOf(_user) returns(uint256 userSrcBalance) {
            return userSrcBalance;
        } catch {
            revert("Error: ActionERC20Transfer.getUsersSourceTokenBalance: balanceOf");
        }
    }

    // ===== ACTION CONDITIONS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(string memory)  // actionCondition
    {
        return _actionConditionsCheck(_actionPayloadWithSelector);
    }

    function _actionConditionsCheck(bytes memory _actionPayloadWithSelector)
        internal
        view
        returns(string memory)  // // actionCondition
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (,, address _src, uint256 _srcAmt,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if (!_src.isContract()) return "ActionERC20Transfer: NotOkERC20Address";

        IERC20 srcERC20 = IERC20(_src);

        try srcERC20.balanceOf(address(this)) returns(uint256 srcBalance) {
            if (srcBalance < _srcAmt) return "ActionERC20Transfer: NotOkUserProxyBalance";
        } catch {
            return "ActionERC20Transfer: ErrorBalanceOf";
        }
        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }
}
