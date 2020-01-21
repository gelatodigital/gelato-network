pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract ActionERC20Transfer is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Caught/Handled Errors
        ErrorTransfer
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 80000;

    event LogAction(
        address indexed user,
        address indexed userProxy,
        IERC20 indexed src,
        uint256 srcAmt,
        address beneficiary
    );

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
        returns (GelatoCoreEnums.ExecutionResults, Reason)
    {
        try _src.transfer(_beneficiary, _srcAmt) {
            emit LogAction(_user, _userProxy, _src, _srcAmt, _beneficiary);
            return (
                GelatoCoreEnums.ExecutionResults.Success,
                Reason.Ok
            );
        } catch {
            return (
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.ErrorTransfer
            );
        }
    }

    // ===== ACTION CONDITIONS CHECK ========
    enum ActionConditions {
        Ok,  // 0: Standard Field for Fulfilled Conditions
        // NotOk: Unfulfilled Conditions
        NotOkERC20Address,
        NotOkUserProxyBalance,
        // NotOk: Handled Errors
        ErrorBalanceOf
    }


    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(bool, uint8)  // executable?, reason
    {
        return _actionConditionsCheck(_actionPayloadWithSelector);
    }

    function _actionConditionsCheck(bytes memory _actionPayloadWithSelector)
        internal
        view
        returns(bool, uint8)  // executable?, reason
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (,, address _src, uint256 _srcAmt,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if (!_src.isContract())
            return(false, uint8(ActionConditions.NotOkERC20Address));

        IERC20 srcERC20 = IERC20(_src);

        try srcERC20.balanceOf(address(this)) returns(uint256 srcBalance) {
            if (srcBalance < _srcAmt)
                return (false, uint8(ActionConditions.NotOkUserProxyBalance));
        } catch {
            return (false, uint8(ActionConditions.ErrorBalanceOf));
        }

        return (true, uint8(ActionConditions.Ok));
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
}
