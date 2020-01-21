pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract KovanActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for No Errors
        // NotOk: Caught/Handled Errors
        TransferFromUserError,
        ApproveKyberError,
        KyberGetExpectedRateError,
        KyberTradeError
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 1000000;

    event LogAction(
        address indexed user,
        address indexed userProxy,
        address indexed src,
        uint256 srcAmt,
        address dest,
        uint256 destAmt,
        uint256 minConversionRate,
        address feeSharingParticipant
    );

    function action(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _src,
        uint256 _srcAmt,
        address _dest
    )
        external
        returns (GelatoCoreEnums.ExecutionResults, Reason)
    {
        // !!!!!!!!! Kovan !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

        IERC20 srcERC20 = IERC20(_src);
        {
            try srcERC20.transferFrom(_user, address(this), _srcAmt) {
                // Pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResults.ActionNotOk,
                    Reason.TransferFromUserError
                );
            }

            try srcERC20.approve(kyberAddress, _srcAmt) {
                // Pass
            } catch {
                _transferBackToUser(srcERC20, _user, _srcAmt);
                return (
                    GelatoCoreEnums.ExecutionResults.ActionNotOk,
                    Reason.ApproveKyberError
                );
            }
        }

        // !! Dapp Interaction !!
        // Fetch the Kyber expected max slippage rate and assign to minConverstionRate
        uint256 minConversionRate;
        try IKyber(kyberAddress).getExpectedRate(
            _src,
            _dest,
            _srcAmt
        )
            returns(uint256 expectedRate, uint256 slippageRate)
        {
           minConversionRate = slippageRate;
        } catch {
            _transferBackToUser(srcERC20, _user, _srcAmt);
            _revokeKyberApproval(srcERC20, kyberAddress, _srcAmt);
            return(
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.KyberGetExpectedRateError
            );
        }

        // !! Dapp Interaction !!
        try IKyber(kyberAddress).trade(
            _src,
            _srcAmt,
            _dest,
            _user,
            2**255,
            minConversionRate,
            address(0)  // fee-sharing
        )
            returns (uint256 destAmt)
        {
            // Success on Dapp
            emit LogAction(
                _user,
                _userProxy,
                _src,
                _srcAmt,
                _dest,
                destAmt,
                minConversionRate,
                address(0)  // fee-sharing
            );
            return (GelatoCoreEnums.ExecutionResults.Success, Reason.Ok);
        } catch {
            _transferBackToUser(srcERC20, _user, _srcAmt);
            _revokeKyberApproval(srcERC20, kyberAddress, _srcAmt);
            return (
                GelatoCoreEnums.ExecutionResults.DappNotOk,
                Reason.KyberTradeError
            );
        }
    }

    // ====== ACTION CONDITIONS CHECK ==========
    enum ActionConditions {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions
        // NotOk: Unfulfilled Conditions
        NotOkSrcAddress,
        NotOkUserBalance,
        NotOkUserProxyAllowance,
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

        (address _user, address _userProxy, address _src, uint256 _srcAmt,) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if (!_src.isContract())
            return(false, uint8(ActionConditions.NotOkSrcAddress));

        IERC20 srcERC20 = IERC20(_src);

        try srcERC20.balanceOf(_user) returns(uint256 userSrcBalance) {
            if (userSrcBalance < _srcAmt)
                return (false, uint8(ActionConditions.NotOkUserBalance));
        } catch {
            return (false, uint8(ActionConditions.ErrorBalanceOf));
        }

        try srcERC20.allowance(_user, _userProxy) returns(uint256 userProxySrcAllowance) {
            if (userProxySrcAllowance < _srcAmt)
                return (false, uint8(ActionConditions.NotOkUserProxyAllowance));
        } catch {
            return (false, uint8(ActionConditions.ErrorAllowance));
        }

        return (true, uint8(ActionConditions.Ok));
    }


    // Cleanup functions in case of reverts during action() execution
    function _transferBackToUser(IERC20 erc20, address _user, uint256 amt) internal {
        try erc20.transfer(_user, amt) {} catch {
            revert("ActionKyberTrade._transferBackToUser failed");
        }
    }

    function _revokeKyberApproval(IERC20 erc20, address kyber, uint256 amt) internal {
        uint256 allowance = erc20.allowance(address(this), kyber);
        uint256 newAllowance = allowance.sub(amt, "SafeERC20: decreased allowance below zero");
        try erc20.approve(kyber, newAllowance) {} catch {
            revert("ActionKyberTrade._revokeKyberApproval failed");
        }
    }
}
