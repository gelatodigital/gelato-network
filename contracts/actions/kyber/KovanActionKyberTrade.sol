pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";
import "../../external/SafeMath.sol";

contract KovanActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;

    // Extends IGelatoCoreEnums.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Unfulfilled Conditions
        UserBalanceNotOk,
        UserProxyAllowanceNotOk,
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
    uint256 public constant override actionConditionsCheckGas = 50000;
    uint256 public constant override actionGas = 1000000;
    uint256 public constant override actionTotalGas = actionConditionsCheckGas + actionGas;

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
        returns (GelatoCoreEnums.ExecutionResult, Reason)
    {
        // !!!!!!!!! Kovan !!!!!!
        address kyberAddress = 0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D;

        IERC20 srcERC20 = IERC20(_src);
        {
            try srcERC20.transferFrom(_user, address(this), _srcAmt) {
                // Pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
                    Reason.TransferFromUserError
                );
            }

            try srcERC20.approve(kyberAddress, _srcAmt) {
                // Pass
            } catch {
                _transferBackToUser(srcERC20, _user, _srcAmt);
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
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
                GelatoCoreEnums.ExecutionResult.DappNotOk,
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
            return (GelatoCoreEnums.ExecutionResult.Success, Reason.Ok);
        } catch {
            _transferBackToUser(srcERC20, _user, _srcAmt);
            _revokeKyberApproval(srcERC20, kyberAddress, _srcAmt);
            return (
                GelatoCoreEnums.ExecutionResult.DappNotOk,
                Reason.KyberTradeError
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

        uint256 userSrcBalance = srcERC20.balanceOf(_user);
        if (userSrcBalance < _srcAmt)
            return (false, uint8(Reason.UserBalanceNotOk));

        uint256 userProxySrcAllowance = srcERC20.allowance(_user, _userProxy);
        if (userProxySrcAllowance < _srcAmt)
            return (false, uint8(Reason.UserProxyAllowanceNotOk));

        return (true, uint8(Reason.Ok));
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
