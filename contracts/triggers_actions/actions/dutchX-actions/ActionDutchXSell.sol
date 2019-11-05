pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '../GelatoActionsStandard.sol';
import '../../../interfaces/dapp_interfaces/dutchX_interfaces/GelatoDutchXInterface.sol';

/**
 * @title ActionDutchXSell
 * @notice posts sell orders into dutchX auctions - caution: funds are NOT SOLD,
   but merely posted into auctions. Trade settlement will happen asynchronously.
 * @dev The funds sold via this Action can be withdrawn with ActionWithdrawFromDutchX*
 */
contract ActionDutchXSell is Initializable,
                             GelatoActionsStandard,
                             GelatoDutchXInterface
{
    /**
     * @dev OpenZeppelin's upgradeable contracts constructor function. Should be
       called immediately after deployment and only once in a proxyWrapper's lifetime.
       Calls are forwarded to the internal _initialize fn to allow for external-internal
       distinction and inheritance.
     * @param _dutchX the address of the deployed dutchX Proxy
     * @param _actionGasStipend the maxGas consumption of a normal tx to this.action()
     */
    function initialize(uint256 _actionGasStipend, address _dutchX)
        external
    {
        _initialize(_actionGasStipend, _dutchX);
    }
    function _initialize(uint256 _actionGasStipend, address _dutchX)
        internal
        initializer
    {
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        GelatoDutchXInterface._initialize(_dutchX);
    }

    // ___________________ actionConditionsFulfilled fn & API ________________________
    /**
     * @dev receives forwarded calls from actionConditionsFulfilled API or is used
       in derived contracts. Internal-External distinction and msg.sender persistance.
     * @param _user per gelato protocol address(this) should be the user's proxy
     * @param _specificActionParams x
     */
    function _actionConditionsFulfilled(// Standard Action Params
                                        address _user,
                                        // // Specific Action Params
                                        bytes memory _specificActionParams
    )
        internal
        view
        returns(bool)
    {
        (address _sellToken,
         address _buyToken,
         uint256 _sellAmount)
            = abi.decode(_specificActionParams, (// Specific Action Params
                                                 address,  // sellToken
                                                 address,  // buyToken
                                                 uint256)  // sellAmount
        );
        bool validTokenPair;
        if (dutchX.getAuctionIndex(_sellToken, _buyToken) == 0) {
            validTokenPair = false;
        } else {
            validTokenPair = true;
        }
        IERC20 sellToken = IERC20(_sellToken);
        bool userProxyHasAllowance
            = sellToken._hasERC20Allowance(_user, address(this), _sellAmount);
        bool userHasFunds = sellToken.balanceOf(_user) >= _sellAmount;
        return (validTokenPair && userProxyHasAllowance && userHasFunds);
    }
    /**
     * @notice Returns true if the token-pair is valid, the user proxy has the user's
         ERC20 allowance and the  user has the ERC20 balance at the time of the call.
     * @dev overrides and extend the function of GelatoActionsStandard. Forwards calls
        to internal fn _actionConditionsFulfilled as part of internal-external
        interface distinction and enablement of proper usage (msg.sender persistance)
        via inheritance.
     * @param _user the end-users address
     * @param _specificActionParams the encoded specific params for this.action
     * @return boolean true if validTokenPair, userProxyHasAllowance and userHasFunds
     */
    function actionConditionsFulfilled(// Standard Param
                                       address _user,
                                       // Specific Param(s)
                                       bytes calldata _specificActionParams
    )
        external
        view
        returns(bool)
    {
        return _actionConditionsFulfilled(_user, _specificActionParams);
    }
    // ======================

    // ___________________ ACTION FUNCTION & API __________________________________
    ///@dev Internal action fn to enable inheritance with msg.sender persistance
    function _action(// Standard Action Params
                     uint256 _executionClaimId,
                     address _user,
                     // Specific Action Params
                     address _sellToken,
                     address _buyToken,
                     uint256 _sellAmount
    )
        internal
        returns(bool, uint256, uint256)
    {
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee) = _sellOnDutchX(_executionClaimId,
                                                     _user,
                                                     _sellToken,
                                                     _buyToken,
                                                     _sellAmount
        );
        require(success,
            "ActionDutchXSell.action._sellOnDutchX failed"
        );
        emit LogAction(_executionClaimId, _user);
        return (true, sellAuctionIndex, sellAmountAfterFee);
    }
    /**
     * @notice posts user's sell order on DutchX
     * @dev action API to be .delegatecalled by userProxy.execute(). Forwards calls
        to internal fn _action as part of internal-external interface distinction
        and enablement of proper usage (msg.sender persistance) via inheritance.
     * @param _executionClaimId the id received from gelatoCore.mintExecutionClaim()
     * @param _user the actual end-user (not their Gelato userProxy)
     * @param _sellToken x
     * @param _buyToken x
     * @param _sellAmount x
     * @return boolean true if _sellOnDutchX succeeded, else false
     * @return uint256 sellAuctionIndex: the auction into which _sellAmount was posted
     * @return uint256 sellAmountAfterFee == actualSellAmount: _sellAmount - dutchXFee
     */
    function action(// Standard Action Params
                    uint256 _executionClaimId,
                    address _user,
                    // Specific Action Params
                    address _sellToken,
                    address _buyToken,
                    uint256 _sellAmount
    )
        external
        returns(bool, uint256, uint256)
    {
        return _action(_executionClaimId, _user, _sellToken, _buyToken, _sellAmount);
    }
    // ======================
}
