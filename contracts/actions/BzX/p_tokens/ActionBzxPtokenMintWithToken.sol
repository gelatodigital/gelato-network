pragma solidity ^0.6.0;

import "../../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../gelato_core/GelatoCoreEnums.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionBzxPtokenMintWithToken is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok
        OkPtokensMinted,
        // NotOk: Unfulfilled Conditions
        NotOkUserDepositTokenBalance,
        NotOkUserProxyDepositTokenAllowance,
        NotOkDepositAmount,
        // NotOk: Caught/Handled Errors
        ErrorPtokenMarketLiquidityForLoan,
        ErrorTransferFromUser,
        ErrorApprovePtoken,
        ErrorPtokenMintWithToken
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 4500000;

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
        returns (GelatoCoreEnums.ExecutionResults, Reason)
    {
        IERC20 depositToken = IERC20(_depositTokenAddress);
        {
            try depositToken.transferFrom(_user, address(this), _depositAmount) {} catch {
                return (
                    GelatoCoreEnums.ExecutionResults.ActionNotOk,
                    Reason.ErrorTransferFromUser
                );
            }

            try depositToken.approve(_pTokenAddress, _depositAmount) {} catch {
                _transferBackToUser(depositToken, _user, _depositAmount);
                return (
                    GelatoCoreEnums.ExecutionResults.ActionNotOk,
                    Reason.ErrorApprovePtoken
                );
            }
        }

        // !! Dapp Interaction !!
        // Fetch the pToken's price and allow for maxi
        /*uint256 minConversionRate;
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
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.KyberGetExpectedRateError
            );
        }*/

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
            return (GelatoCoreEnums.ExecutionResults.Success, Reason.OkPtokensMinted);
        } catch {
            _transferBackToUser(depositToken, _user, _depositAmount);
            _revokePtokenApproval(depositToken, _pTokenAddress, _depositAmount);
            return (
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.ErrorPtokenMintWithToken
            );
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    enum ActionConditions {
        Ok, // 0: Standard Field for Fulfilled Conditions
        // NotOk: Unfulfilled Conditions
        NotOkDepositTokenAddress,
        NotOkUserDepositTokenBalance,
        NotOkUserProxyDepositTokenAllowance,
        NotOkDepositAmount,
        // NotOk: Handled Errors
        ErrorBalanceOf,
        ErrorAllowance,
        ErrorMarketLiquidityForLoan
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
         uint256 _depositAmount,
         address _pTokenAddress) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if(!_depositTokenAddress.isContract())
            return(false, uint8(ActionConditions.NotOkDepositTokenAddress));

        IERC20 depositToken = IERC20(_depositTokenAddress);

        try depositToken.balanceOf(_user) returns(uint256 userDepositTokenBalance) {
            if (userDepositTokenBalance < _depositAmount)
                return (false, uint8(ActionConditions.NotOkUserDepositTokenBalance));
        } catch {
            return (false, uint8(ActionConditions.ErrorBalanceOf));
        }

        try depositToken.allowance(_user, _userProxy)
            returns(uint256 userProxyDepositTokenAllowance)
        {
            if (userProxyDepositTokenAllowance < _depositAmount) {
                return (
                    false,
                    uint8(ActionConditions.NotOkUserProxyDepositTokenAllowance)
                );
            }
        } catch {
            return (false, uint8(ActionConditions.ErrorAllowance));
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).marketLiquidityForLoan()
            returns (uint256 maxDepositAmount)
        {
            if (maxDepositAmount < _depositAmount)
                return (false, uint8(ActionConditions.NotOkDepositAmount));
        } catch {
            return (false, uint8(ActionConditions.ErrorMarketLiquidityForLoan));
        }

        // All conditions fulfilled
        return (true, uint8(ActionConditions.Ok));
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
            revert(
                "Error: ActionBzxPtokenMintWithToken.getUsersSourceTokenBalance: balanceOf"
            );
        }
    }
}
