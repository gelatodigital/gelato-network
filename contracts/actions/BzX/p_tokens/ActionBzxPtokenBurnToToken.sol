pragma solidity ^0.6.0;

import "../../GelatoActionsStandard.sol";
import "../../../helpers/SplitFunctionSelector.sol";
import "../../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../gelato_core/GelatoCoreEnums.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionBzxPtokenBurnToToken is GelatoActionsStandard, SplitFunctionSelector {
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
        OkPtokensBurntForTokens,
        // NotOk: Unfulfilled Conditions
        NotOkUserPtokenBalance,
        NotOkUserProxyPtokenAllowance,
        // NotOk: Caught/Handled Errors
        ErrorTransferFromPToken,
        ErrorPtokenBurnToToken
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 4000000;

    event LogAction(
        address indexed user,
        address indexed userProxy,
        address burnTokenAddress,
        uint256 burnAmount,
        address indexed pTokenAddress,
        uint256 minPriceAllowed,
        uint256 tokensReceivable
    );

    function action(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        // Specific Action Params
        address _pTokenAddress,
        uint256 _burnAmount,
        address _burnTokenAddress
    )
        external
        returns (GelatoCoreEnums.ExecutionResults, Reason)
    {
        IERC20 pToken = IERC20(_pTokenAddress);
        {
            try pToken.transferFrom(_user, address(this), _burnAmount) {} catch {
                return (
                    GelatoCoreEnums.ExecutionResults.ActionNotOk,
                    Reason.ErrorTransferFromPToken
                );
            }
        }

        // !! Dapp Interaction !!
        // Fetch the pToken's price and allow for maxi
        /* uint256 minConversionRate;
        try IBzxPtoken(_pTokenAddress).tokenPrice(
            _burnTokenAddress,
            _dest,
            _burnAmount
        )
            returns(uint256 expectedRate, uint256 slippageRate)
        {
           minConversionRate = slippageRate;
        } catch {
            _transferBackToUser(burnToken, _user, _burnAmount);
            _revokePtokenApproval(burnToken, _pTokenAddress, _burnAmount);
            return(
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.KyberGetExpectedRateError
            );
        } */

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).burnToToken(
            _user,  // receiver
            _burnTokenAddress,
            _burnAmount,
            0  // minPriceAllowed - 0 ignores slippage limit
        )
            returns (uint256 tokensReceivable)
        {
            // Success on Dapp (pToken)
            emit LogAction(
                _user,
                _userProxy,
                _burnTokenAddress,
                _burnAmount,
                _pTokenAddress,
                0,  // minPriceAllowed
                tokensReceivable
            );
            return (GelatoCoreEnums.ExecutionResults.Success, Reason.OkPtokensBurntForTokens);
        } catch {
            return (
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.ErrorPtokenBurnToToken
            );
        }
    }


    // ======= ACTION CONDITIONS CHECK =========
    enum ActionConditions {
        Ok, // 0: Standard Field for Fulfilled Conditions
        // NotOk: Unfulfilled Conditions
        NotOkPTokenAddress,
        NotOkUserPtokenBalance,
        NotOkUserProxyPtokenAllowance,
        // NotOk: Handled Errors
        ErrorBalanceOf,
        ErrorAllowance
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
         address _,
         uint256 _burnAmount,
         address _pTokenAddress) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if(!_pTokenAddress.isContract())
            return(false, uint8(ActionConditions.NotOkPTokenAddress));

        IERC20 pToken = IERC20(_pTokenAddress);

        try pToken.balanceOf(_user) returns(uint256 userPtokenBalance) {
            if (userPtokenBalance < _burnAmount)
                return (false, uint8(ActionConditions.NotOkUserPtokenBalance));
        } catch {
            return (false, uint8(ActionConditions.ErrorBalanceOf));
        }

        try pToken.allowance(_user, _userProxy) returns(uint256 userProxyAllowance) {
            if (userProxyAllowance < _burnAmount)
                return (false, uint8(ActionConditions.NotOkUserProxyPtokenAllowance));
        } catch {
            return (false, uint8(ActionConditions.ErrorAllowance));
        }

        // All conditions fulfilled
        return (true, uint8(ActionConditions.Ok));
    }
}
