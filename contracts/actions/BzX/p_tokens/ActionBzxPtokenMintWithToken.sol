pragma solidity ^0.6.0;

import "../../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionBzxPtokenMintWithToken is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 4200000;

    function action(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        // Specific Action Params
        address _depositTokenAddress,
        uint256 _depositAmount,
        address _pTokenAddress,
        uint256 _maxPriceAllowed
    )
        external
        virtual
    {
        require(
            _isUserOwnerOfUserProxy(_user, _userProxy),
            "ActionBzxPtokenMintWithToken: NotOkUserProxyOwner"
        );
        require(address(this) == _userProxy, "ActionBzxPtokenMintWithToken: ErrorUserProxy");

        IERC20 depositToken = IERC20(_depositTokenAddress);
        try depositToken.transferFrom(_user, _userProxy, _depositAmount) {} catch {
            revert("ActionBzxPtokenMintWithToken: ErrorTransferFromUser");
        }
        try depositToken.approve(_pTokenAddress, _depositAmount) {} catch {
            revert("ActionBzxPtokenMintWithToken: ErrorApprovePtoken");
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).mintWithToken(
            _user,  // receiver
            _depositTokenAddress,
            _depositAmount,
            _maxPriceAllowed  // maxPriceAllowed - 0 ignores slippage limit
        ) {} catch {
            revert("ActionBzxPtokenMintWithToken: ErrorPtokenMintWithToken");
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
        return _actionConditionsCheck(_actionPayloadWithSelector);
    }

    function _actionConditionsCheck(bytes memory _actionPayloadWithSelector)
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (address _user,
         address _userProxy,
         address _depositTokenAddress,
         uint256 _depositAmount,
         address _pTokenAddress, ) = abi.decode(
            payload,
            (address, address, address, uint256, address, uint256)
        );

        if (!_isUserOwnerOfUserProxy(_user, _userProxy))
            return "ActionBzxPtokenMintWithToken: NotOkUserProxyOwner";

        if (!_depositTokenAddress.isContract())
            return "ActionBzxPtokenMintWithToken: NotOkDepositTokenAddress";

        IERC20 depositToken = IERC20(_depositTokenAddress);
        try depositToken.balanceOf(_user) returns(uint256 userDepositTokenBalance) {
            if (userDepositTokenBalance < _depositAmount)
                return "ActionBzxPtokenMintWithToken: NotOkUserDepositTokenBalance";
        } catch {
            return "ActionBzxPtokenMintWithToken: ErrorBalanceOf";
        }
        try depositToken.allowance(_user, _userProxy)
            returns(uint256 userProxyDepositTokenAllowance)
        {
            if (userProxyDepositTokenAllowance < _depositAmount)
                return "ActionBzxPtokenMintWithToken: NotOkUserProxyDepositTokenAllowance";
        } catch {
            return "ActionBzxPtokenMintWithToken: ErrorAllowance";
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).marketLiquidityForLoan()
            returns (uint256 maxDepositAmount)
        {
            if (maxDepositAmount < _depositAmount)
                return "ActionBzxPtokenMintWithToken: NotOkDepositAmount";
        } catch {
           return "ActionBzxPtokenMintWithToken: ErrorMarketLiquidityForLoan";
        }

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }


    // ============ API for FrontEnds ===========
    function getUsersSourceTokenBalance(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        // Specific Action Params
        address _depositTokenAddress,
        uint256,
        address,
        uint256
    )
        external
        view
        virtual
        returns(uint256)
    {
        _userProxy;  // silence warning
        IERC20 depositToken = IERC20(_depositTokenAddress);
        try depositToken.balanceOf(_user) returns(uint256 userDepositTokenBalance) {
            return userDepositTokenBalance;
        } catch {
            revert(
                "Error: ActionBzxPtokenMintWithToken.getUsersSourceTokenBalance: balanceOf"
            );
        }
    }
}
