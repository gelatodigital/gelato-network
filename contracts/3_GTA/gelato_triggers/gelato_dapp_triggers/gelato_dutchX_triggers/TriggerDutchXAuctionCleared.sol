pragma solidity ^0.5.10;

import '../../../../1_gelato_standards/3_GTA_standards/gelato_trigger_standards/GelatoTriggersStandard.sol';
import '../../../../1_gelato_standards/1_gelato_dappInterface_standards/gelato_dutchX/IDutchX.sol';

contract TriggerDutchXAuctionCleared is GelatoTriggersStandard {

    IDutchX public dutchX;

    constructor(address payable _gelatoCore,
                string memory _triggerSignature,
                address _dutchX
    )
        public
        GelatoTriggersStandard(_gelatoCore, _triggerSignature)
    {
        dutchX = IDutchX(_dutchX);
    }

    function getAuctionClosingPrices(address _sellToken,
                                     address _buyToken,
                                     uint256 _auctionIndex
    )
        public
        view
        returns(uint256 num, uint256 den)
    {
        (num, den) = dutchX.closingPrices(_sellToken,
                                          _buyToken,
                                          _auctionIndex
        );
    }

    function fired(address _sellToken,
                   address _buyToken,
                   uint256 _auctionIndex
    )
        public
        view
        returns(bool)
    {
        (, uint256 den) = getAuctionClosingPrices(_sellToken, _buyToken, _auctionIndex);
        if (den == 0) {
            return false;
        } else {
            return true;
        }
    }

    function getDutchXAddress()
        public
        view
        returns(address)
    {
        return address(dutchX);
    }
}