pragma solidity ^0.5.10;

import '../GelatoActionsStandard.sol';
import '../../../interfaces/dapp_interfaces/dutchX_interfaces/GelatoDutchXInterface.sol';

contract ActionDutchXSell is GelatoActionsStandard,
                             GelatoDutchXInterface
{
    function initialize(address _dutchX, uint256 _actionGasStipend)
        external
    {
        _initialize(_dutchX, _actionGasStipend);
    }

    function _initialize(address _dutchX, uint256 _actionGasStipend)
        internal
        initializer
    {
        GelatoActionsStandard._initialize(this.action.selector, _actionGasStipend);
        GelatoDutchXInterface._initialize(_dutchX);
    }

    // SellCondition: token pair is traded on DutchX and user approved ERC20s
    function _actionConditionsFulfilled(// Standard Param
                                        address _user,
                                        // Specific Param
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

    /// @dev overriding Standard fn - called by triggers/frontends for sanity check
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

    // Action: public due to msg.sender context persistance, in internal calls (chaining)
    function action(// Standard Action Params
                    uint256 _executionClaimId,
                    address _user,
                    // Specific Action Params
                    address _sellToken,
                    address _buyToken,
                    uint256 _sellAmount
    )
        public
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
        emit LogAction(_executionClaimId, user);
        return (true, sellAuctionIndex, sellAmountAfterFee);
    }
}
