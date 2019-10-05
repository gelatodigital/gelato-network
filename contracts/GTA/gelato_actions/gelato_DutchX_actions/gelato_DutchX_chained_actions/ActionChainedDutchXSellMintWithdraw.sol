pragma solidity ^0.5.10;

import '../ActionDutchXSell.sol';
import '../../../GTA_standards/GTA_chained/GTAChainedMinting.sol';

contract ActionChainedDutchXSellMintWithdraw is ActionDutchXSell,
                                                GTAChainedMinting
{
    constructor(address payable _gelatoCore,
                address _dutchX,
                string memory _actionSignature,
                uint256 _actionGasStipend,
                address _mintingGTAI,
                address _chainedTrigger,
                address _chainedAction
    )
        public
        ActionDutchXSell(_gelatoCore,
                         _dutchX,
                         _actionSignature,
                         _actionGasStipend
        )
        GTAChainedMinting(_mintingGTAI,
                          _chainedTrigger,
                          _chainedAction
        )
    {}

    // Action:
    function sellMintWithdraw(// Standard Action Params
                              uint256 _executionClaimId,  // via execute() calldata
                              address _executionClaimOwner,  // via actionPayload
                              // Specific Action Params
                              address _sellToken,
                              address _buyToken,
                              uint256 _sellAmount
    )
        public
        returns(bool)
    {
        // Standard action Setup
        address executionClaimOwner
            = GelatoActionsStandard._setup(_executionClaimOwner,
                                           _executionClaimId
        );

        // action: perform checks and sell on dutchX
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee)
            = ActionDutchXSell.sell(_executionClaimId,
                                    executionClaimOwner,
                                    _sellToken,
                                    _buyToken,
                                    _sellAmount
        );
        require(success,
            "ActionChainedDutchXSellMintWithdraw.super.action: failed"
        );
        // chained minting: mint withdrawal execution claims via gtai
        bytes memory chainedTriggerPayload
            = abi.encodeWithSelector(_getChainedTriggerSelector(),
                                     _sellToken,
                                     _buyToken,
                                     sellAuctionIndex
        );
        bytes memory chainedActionPayload
            = abi.encodeWithSelector(_getChainedActionSelector(),
                                     _executionClaimId,
                                     address(0), // == chainedAction will fetch ecOwner
                                     _sellToken,
                                     _buyToken,
                                     address(this),  // seller
                                     sellAuctionIndex,
                                     sellAmountAfterFee
        );
        require(_activateChainedTAviaMintingGTAI(executionClaimOwner,
                                                 chainedTriggerPayload,
                                                 chainedActionPayload),
            "ActionChainedDutchXSellMintWithdraw._mintExecutionClaim: failed"
        );
        emit LogGTAChainedMinting(_executionClaimId, executionClaimOwner);
        return true;
    }
}
