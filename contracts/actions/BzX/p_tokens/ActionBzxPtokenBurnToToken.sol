pragma solidity ^0.6.0;

import "../../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionBzxPtokenBurnToToken is GelatoActionsStandard {
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
        address _pTokenAddress,
        uint256 _burnAmount,
        address _burnTokenAddress
    )
        external
        virtual
    {
        require(
            _isUserOwnerOfUserProxy(_user, _userProxy),
            "ActionBzxPtokenBurnToToken: NotOkUserProxyOwner"
        );
        require(address(this) == _userProxy, "ActionBzxPtokenBurnToToken: ErrorUserProxy");

        IERC20 pToken = IERC20(_pTokenAddress);
        try pToken.transferFrom(_user, _userProxy, _burnAmount) {} catch {
           revert("ActionBzxPtokenBurnToToken: ErrorTransferFromPToken");
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_pTokenAddress).burnToToken(
            _user,  // receiver
            _burnTokenAddress,
            _burnAmount,
            0 // minPriceAllowed - 0 ignores slippage
        ) {} catch {
           revert("ActionBzxPtokenBurnToToken: ErrorPtokenBurnToToken");
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
         address _pTokenAddress,
         uint256 _burnAmount, ) = abi.decode(
            payload,
            (address, address, address, uint256, address)
        );

        if (!_isUserOwnerOfUserProxy(_user, _userProxy))
            return "ActionBzxPtokenBurnToToken: NotOkUserProxyOwner";

        if(!_pTokenAddress.isContract())
            return "ActionBzxPtokenBurnToToken: NotOkPTokenAddress";

        IERC20 pToken = IERC20(_pTokenAddress);
        try pToken.balanceOf(_user) returns(uint256 userPtokenBalance) {
            if (userPtokenBalance < _burnAmount)
                return "ActionBzxPtokenBurnToToken: NotOkUserPtokenBalance";
        } catch {
            return "ActionBzxPtokenBurnToToken: ErrorBalanceOf";
        }
        try pToken.allowance(_user, _userProxy) returns(uint256 userProxyAllowance) {
            if (userProxyAllowance < _burnAmount)
                return "ActionBzxPtokenBurnToToken: NotOkUserProxyPtokenAllowance";
        } catch {
            return "ActionBzxPtokenBurnToToken: ErrorAllowance";
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
        address _pTokenAddress,
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _userProxy;  // silence warning
        IERC20 pToken = IERC20(_pTokenAddress);
        try pToken.balanceOf(_user) returns(uint256 userPTokenBalance) {
            return userPTokenBalance;
        } catch {
            revert(
                "Error: ActionBzxPtokenBurnToToken.getUsersSourceTokenBalance: balanceOf: balanceOf"
            );
        }
    }
}
