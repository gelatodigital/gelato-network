pragma solidity >=0.4.21 <0.6.0;

import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';


contract DutchXGetter {

    DutchExchange public dutchExchange;

    struct Fraction {
        uint num;
        uint den;
    }

    constructor(address _dutchExchangeProxy) public {
        dutchExchange = DutchExchange(_dutchExchangeProxy);
    }

    function getClosingPricesOne(address _sellToken, address _buyToken, uint256 _auctionIndex)
        public
        view
        returns( uint256, uint256)
    {
        uint256 den;
        uint256 num;
        (num, den) = dutchExchange.getCurrentAuctionPrice(_sellToken, _buyToken, _auctionIndex);
        return (num, den);
    }


    function getFeeRatio(address _dxInterface)
        public
        view
        returns ( uint256, uint256)
    {
        uint256 den;
        uint256 num;
        (num, den) = dutchExchange.getFeeRatio(_dxInterface);
        return (den, num);
    }

    function getAuctionIndex(address _sellToken, address _buyToken)
        public
        view
        returns(uint256 auctionIndex)
    {
        auctionIndex = dutchExchange.getAuctionIndex(_sellToken, _buyToken);
    }
}