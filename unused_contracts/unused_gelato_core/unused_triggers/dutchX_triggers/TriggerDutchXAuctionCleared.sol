pragma solidity ^0.5.11;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../GelatoTriggersStandard.sol";
import "../../../dapp_interfaces/dutchX_interfaces/IDutchX.sol";

contract TriggerDutchXAuctionCleared is Initializable,
                                        GelatoTriggersStandard

{

    IDutchX public dutchX;

    function initialize(address _dutchX)
        external
        initializer
    {
        triggerSelector = this.fired.selector;
        dutchX = IDutchX(_dutchX);
    }

    function getDutchXAddress() external view returns(address) { return address(dutchX);}

    function _getAuctionClosingPrices(address _sellToken,
                                      address _buyToken,
                                      uint256 _auctionIndex
    )
        internal
        view
        returns(uint256 num, uint256 den)
    {
        (num, den) = dutchX.closingPrices(_sellToken, _buyToken, _auctionIndex);
    }

    function getAuctionClosingPrices(address _sellToken,
                                     address _buyToken,
                                     uint256 _auctionIndex
    )
        external
        view
        returns(uint256, uint256)
    {
        return _getAuctionClosingPrices(_sellToken, _buyToken, _auctionIndex);
    }

    function fired(address _sellToken,
                   address _buyToken,
                   uint256 _auctionIndex
    )
        external
        view
        returns(bool)
    {
        (, uint256 den) = _getAuctionClosingPrices(_sellToken, _buyToken, _auctionIndex);
        if (den == 0) {
            return false;
        }
        return true;
    }
}