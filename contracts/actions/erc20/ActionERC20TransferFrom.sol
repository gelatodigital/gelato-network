pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";
import "../../external/Address.sol";
import "../../external/SafeMath.sol";

contract ActionERC20TransferFrom is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;  /// for oz's sendValue method
    using SafeMath for uint256;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Unfulfilled Conditions
        InvalidERC20Address,
        UserBalanceNotOk,
        UserProxyAllowanceNotOk,
        // NotOk: Caught/Handled Errors
        TransferFromUserError
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionConditionsCheckGas = 30000;
    uint256 public constant override actionGas = 80000;
    uint256 public constant override actionTotalGas = actionConditionsCheckGas + actionGas;

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
        returns (GelatoCoreEnums.ExecutionResult, Reason)
    {
        try _src.transferFrom(_user, _beneficiary, _srcAmt) {
            emit LogAction(_user, _userProxy, _src, _srcAmt, _beneficiary);
            return (
                GelatoCoreEnums.ExecutionResult.Success,
                Reason.Ok
            );
        } catch {
            return (
                GelatoCoreEnums.ExecutionResult.DappNotOk,
                Reason.TransferFromUserError
            );
        }
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

        (address _user, address _userProxy, address _src, uint256 _srcAmt,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        IERC20 srcERC20 = IERC20(_src);

        if(!address(_src).isContract())
            return(false, uint8(Reason.InvalidERC20Address));

        uint256 userSrcBalance = srcERC20.balanceOf(_user);
        if (userSrcBalance < _srcAmt)
            return (false, uint8(Reason.UserBalanceNotOk));

        uint256 userProxySrcAllowance = srcERC20.allowance(_user, _userProxy);
        if (userProxySrcAllowance < _srcAmt)
            return (false, uint8(Reason.UserProxyAllowanceNotOk));

        return (true, uint8(Reason.Ok));
    }
}
