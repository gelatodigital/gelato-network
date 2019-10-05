pragma solidity ^0.5.10;

import '../gelato_action_standards/GelatoActionsStandard.sol';
import '../../../gelato_dappInterfaces/gelato_DutchX/gelato_DutchX_standards/GelatoDutchXStandard.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract ActionDutchXSell is GelatoActionsStandard,
                             GelatoDutchXStandard,
                             ReentrancyGuard
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
        GelatoDutchXStandard(_dutchX)
    {}

    // SellCondition: token pair is traded on DutchX
    // To be queried passing actionParams by GTAIs prior to minting
    function actionConditionsFulfilled(bytes memory _actionPayload)
        public
        view
        returns(bool)
    {
        (// Standard Action Params
         ,,,
         // Specific Action Params
         address _sellToken,
         address _buyToken
         ,) = abi.decode(_actionPayload,(// Standard Action Params
                                         bytes4,  // actionSelector
                                         address,  // ecID
                                         uint256,  // ecOwner
                                         // Specific Action Params
                                         address,  // sellToken
                                         address,  // buyToken
                                         uint256)  // sellAmount
        );
        if (dutchX.getAuctionIndex(_sellToken, _buyToken) == 0) {
            return false;
        } else {
            return true;
        }
    }

    // Action:
    function action(// Standard Action Params
                    uint256 _executionClaimId,
                    address _executionClaimOwner,
                    // Specific Action Params
                    address _sellToken,
                    address _buyToken,
                    uint256 _sellAmount
    )
        nonReentrant
        hasERC20Allowance(_sellToken, _executionClaimOwner, _sellAmount)
        public
        returns(bool, uint256, uint256)
    {
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee) = _sellOnDutchX(_executionClaimId,
                                                     _executionClaimOwner,
                                                     _sellToken,
                                                     _buyToken,
                                                     _sellAmount
        );
        require(success,
            "ActionDutchXSell.action._sellOnDutchX failed"
        );
        emit LogAction(_executionClaimId, _executionClaimOwner);
        return (true, sellAuctionIndex, sellAmountAfterFee);
    }
}
