pragma solidity ^0.5.10;

import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';
import '../../../1_gelato_standards/2_GTA_standards/gelato_action_standards/GelatoActionsStandard.sol';
import '../../../1_gelato_standards/1_gelato_dappInterface_standards/gelato_DutchX/GelatoDutchXInterface.sol';

contract ActionDutchXSell is IGelatoAction,
                             GelatoActionsStandard,
                             GelatoDutchXInterface
{
    constructor(address payable _gelatoCore,
                address _dutchX,
                string memory _actionSignature,
                uint256 _actionGasStipend
    )
        public
        GelatoActionsStandard(_gelatoCore,
                              _dutchX,
                              _actionSignature,
                              _actionGasStipend
        )
        GelatoDutchXInterface(_dutchX)
    {}

    // SellCondition: token pair is traded on DutchX and user approved ERC20s
    // To be queried passing actionParams by GTAIs prior to minting
    // Extends GelatiActionsStandard's function
    function _actionConditionsFulfilled(// Standard Param
                                        address _executionClaimOwner,
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
        bool tokensTraded;
        if (dutchX.getAuctionIndex(_sellToken, _buyToken) == 0) {
            tokensTraded = false;
        } else {
            tokensTraded = true;
        }
        bool executionClaimOwnerDidApprove = hasERC20Allowance(_sellToken,
                                                               _executionClaimOwner,
                                                               _sellAmount
        );
        return (tokensTraded && executionClaimOwnerDidApprove);
    }
    // Extends GelatoActionsStandard's function Part
    function actionConditionsFulfilled(// Standard Param
                                       address _executionClaimOwner,
                                       // Specific Param(s)
                                       bytes calldata _specificActionParams
    )
        external
        view
        returns(bool)
    {
        return _actionConditionsFulfilled(_executionClaimOwner, _specificActionParams);
    }

    // Action: public due to msg.sender context persistance, in internal calls (chaining)
    function sell(// Standard Action Params
                  uint256 _executionClaimId,  // via execute() calldata
                  // Specific Action Params
                  address _sellToken,
                  address _buyToken,
                  uint256 _sellAmount
    )
        msgSenderIsGelatoCore
        public
        returns(bool, uint256, uint256)
    {
        address executionClaimOwner =_getExecutionClaimOwner(_executionClaimId);
        require(actionConditionsFulfilled(executionClaimOwner,
                                          abi.encode(_sellToken,
                                                     _buyToken,
                                                     _sellAmount)
                                          ),
            "ActionDutchXSell.action.actionConditionsFulfilled: failed"
        );
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee) = _sellOnDutchX(_executionClaimId,
                                                     executionClaimOwner,
                                                     _sellToken,
                                                     _buyToken,
                                                     _sellAmount
        );
        require(success,
            "ActionDutchXSell.action._sellOnDutchX failed"
        );
        emit LogAction(_executionClaimId, executionClaimOwner);
        return (true, sellAuctionIndex, sellAmountAfterFee);
    }
}
