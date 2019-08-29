pragma solidity >=0.4.21 <0.6.0;

import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';


contract DutchXGetter {

    DutchExchange public dutchExchange;

    constructor(address _dutchExchangeProxy) public {
        dutchExchange = DutchExchange(_dutchExchangeProxy);
    }

    function getClosingPrices(address _sellToken, address _buyToken, uint256 _auctionIndex)
        public
        view
        returns( uint256 num, uint256 den)
    {
        (num, den) = dutchExchange.getCurrentAuctionPrice(_sellToken, _buyToken, _auctionIndex);
    }

    function getFeeRatio(address _dxInterface)
        public
        view
        returns ( uint256 num, uint256 den)
    {
        (num, den) = dutchExchange.getFeeRatio(_dxInterface);
    }

    function getAuctionIndex(address _sellToken, address _buyToken)
        public
        view
        returns(uint256 auctionIndex)
    {
        auctionIndex = dutchExchange.getAuctionIndex(_sellToken, _buyToken);
    }
}