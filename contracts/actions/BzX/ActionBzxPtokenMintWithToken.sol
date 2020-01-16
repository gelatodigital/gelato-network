pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../gelato_core/GelatoCoreEnums.sol";
import "../../external/SafeMath.sol";

contract ActionBzxPtokenMintWithToken is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok
        OkPtokensMinted,
        // NotOk: Unfulfilled Conditions
        UserDepositTokenBalanceNotOk,
        UserProxyDepositTokenAllowanceNotOk,
        // NotOk: Caught/Handled Errors
        TransferFromUserError,
        ApprovePtokenError,
        KyberGetExpectedRateError,
        PtokenMintWithTokenError
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionConditionsCheckGas = 1000000;
    uint256 public constant override actionGas = 3000000;
    uint256 public constant override actionTotalGas = actionConditionsCheckGas + actionGas;

    event LogAction(
        address indexed user,
        address indexed userProxy,
        address depositTokenAddress,
        uint256 depositAmount,
        address indexed pTokenAddress,
        uint256 maxPriceAllowed,
        uint256 pTokensMinted
    );

    function action(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        // Specific Action Params
        address _depositTokenAddress,
        uint256 _depositAmount,
        address _pTokenAddress
    )
        external
        returns (GelatoCoreEnums.ExecutionResult, Reason)
    {
        IERC20 depositToken = IERC20(_depositTokenAddress);
        {
            try depositToken.transferFrom(_user, address(this), _depositAmount) {} catch {
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
                    Reason.TransferFromUserError
                );
            }

            try depositToken.approve(_pTokenAddress, _depositAmount) {} catch {
                _transferBackToUser(depositToken, _user, _depositAmount);
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
                    Reason.ApprovePtokenError
                );
            }
        }

        // !! Dapp Interaction !!
        // Fetch the pToken's price and allow for maxi
        /* uint256 minConversionRate;
        try IBzxPtoken(_pTokenAddress).tokenPrice(
            _depositTokenAddress,
            _dest,
            _depositAmount
        )
            returns(uint256 expectedRate, uint256 slippageRate)
        {
           minConversionRate = slippageRate;
        } catch {
            _transferBackToUser(depositToken, _user, _depositAmount);
            _revokePtokenApproval(depositToken, _pTokenAddress, _depositAmount);
            return(
                GelatoCoreEnums.ExecutionResult.DappNotOk,
                Reason.KyberGetExpectedRateError
            );
        } */

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).mintWithToken(
            _user,  // receiver
            _depositTokenAddress,
            _depositAmount,
            0  // maxPriceAllowed - 0 ignores slippage limit
        )
            returns (uint256 pTokensMinted)
        {
            // Success on Dapp (pToken)
            emit LogAction(
                _user,
                _userProxy,
                _depositTokenAddress,
                _depositAmount,
                _pTokenAddress,
                0,  // maxPriceAllowed
                pTokensMinted
            );
            return (GelatoCoreEnums.ExecutionResult.Success, Reason.OkPtokensMinted);
        } catch {
            _transferBackToUser(depositToken, _user, _depositAmount);
            _revokePtokenApproval(depositToken, _pTokenAddress, _depositAmount);
            return (
                GelatoCoreEnums.ExecutionResult.DappNotOk,
                Reason.PtokenMintWithTokenError
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

        (address _user,
         address _userProxy,
         address _depositTokenAddress,
         uint256 _depositAmount,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        IERC20 depositToken = IERC20(_depositTokenAddress);

        uint256 userDepositTokenBalance = depositToken.balanceOf(_user);
        if (userDepositTokenBalance < _depositAmount)
            return (false, uint8(Reason.UserDepositTokenBalanceNotOk));

        uint256 userProxySrcAllowance = depositToken.allowance(_user, _userProxy);
        if (userProxySrcAllowance < _depositAmount)
            return (false, uint8(Reason.UserProxyDepositTokenAllowanceNotOk));

        return (true, uint8(Reason.Ok));
    }


    // Cleanup functions in case of reverts during action() execution
    function _transferBackToUser(
        IERC20 _depositToken,
        address _user,
        uint256 _depositAmount
    )
        internal
    {
        try _depositToken.transfer(_user, _depositAmount) {} catch {
            revert("ActionBzxPtokenMintWithToken._transferBackToUser failed");
        }
    }

    function _revokePtokenApproval(
        IERC20 _depositToken,
        address _pTokenAddress,
        uint256 _depositAmount
    )
        internal
    {
        uint256 allowance = _depositToken.allowance(address(this), _pTokenAddress);
        uint256 newAllowance = allowance.sub(_depositAmount, "SafeERC20: decreased allowance below zero");
        try _depositToken.approve(_pTokenAddress, newAllowance) {} catch {
            revert("ActionBzxPtokenMintWithToken._revokePtokenApproval failed");
        }
    }
}
