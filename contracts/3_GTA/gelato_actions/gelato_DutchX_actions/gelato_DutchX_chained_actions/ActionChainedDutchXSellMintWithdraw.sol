pragma solidity ^0.5.10;

import '../ActionDutchXSell.sol';
import '../../../../1_gelato_standards/2_GTA_standards/GTA_chained_standards/GTAChainedMintingStandard.sol';

contract ActionChainedDutchXSellMintWithdraw is ActionDutchXSell,
                                                GTAChainedMintingStandard
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
        GTAChainedMintingStandard(_mintingGTAI,
                                  _chainedTrigger,
                                  _chainedAction
        )
    {}

    // Action: public due to msg.sender context persistance, in internal calls (chaining)
    function sellMintWithdraw(// Standard Chained Action Params
                              uint256 _executionClaimId,
                              // Specific Action Params
                              address _sellToken,
                              address _buyToken,
                              uint256 _sellAmount
    )
        msgSenderIsGelatoCore
        public
        returns(bool)
    {
        address executionClaimOwner =_getExecutionClaimOwner(_executionClaimId);
        // action: perform checks and sell on dutchX
        (bool success,
         uint256 sellAuctionIndex,
         uint256 sellAmountAfterFee)
            = ActionDutchXSell.sell(_executionClaimId,
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
                                     _sellToken,
                                     _buyToken,
                                     address(this),  // seller
                                     sellAuctionIndex,
                                     sellAmountAfterFee
        );
        require(_activateChainedTAviaMintingGTAI(executionClaimOwner,
                                                 chainedTriggerPayload,
                                                 chainedActionPayload),
            "ActionChainedDutchXSellMintWithdraw._activateChainedTAviaMintingGTAI: failed"
        );
        emit LogGTAChainedMinting(_executionClaimId, executionClaimOwner);
        return true;
    }
}
