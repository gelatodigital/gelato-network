pragma solidity >=0.4.21 <0.6.0;

import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';

contract DutchXMock is SafeTransfer {

    uint256 auctionIndex;
    uint256 startingTime;
    mapping(address => mapping(address => uint256)) auctionIndecies;
    mapping(address => mapping(address => uint256)) auctionStarts;
    mapping(address => mapping(address => mapping(uint256 => Factorial))) closingPrice;
    mapping(address => Factorial) feeRatios;

    struct Factorial {
        uint256 num;
        uint256 den;
    }
    // By default set to 10
    function getAuctionIndex(address _buyToken, address _sellToken)
        public
        returns (uint)

    {
        if (auctionIndecies[_sellToken][_buyToken] == 0)
        {
            auctionIndecies[_sellToken][_buyToken] = 10;
            return auctionIndecies[_sellToken][_buyToken];
        }
        else
        {
            return auctionIndecies[_sellToken][_buyToken];
        }
    }

    function setAuctionIndex(address _buyToken, address _sellToken, uint256 _index)
        public
    {
        auctionIndecies[_sellToken][_buyToken] = _index;
    }

    function getAuctionStart(address _buyToken, address _sellToken)
        public
        returns (uint)

    {
        if(auctionStarts[_sellToken][_buyToken] == 0)
        {
            auctionStarts[_sellToken][_buyToken] = now - 6 hours;
            return auctionStarts[_sellToken][_buyToken];
        }
        else
        {
            return auctionStarts[_sellToken][_buyToken];
        }
    }

    function setAuctionStarts(address _buyToken, address _sellToken, uint256 _startDate)
        public
    {
        auctionStarts[_sellToken][_buyToken] = _startDate;
    }

    function getFeeRatio(address _sender)
        public
        returns (uint256, uint256)

    {

        // Get Factorial
        Factorial storage factorial = feeRatios[_sender];


        if (factorial.num == 0 && factorial.den == 0)
        {
            factorial.num = 1;
            factorial.den = 500;
            return (factorial.num, factorial.den);
        }
        else
        {
            return (factorial.num, factorial.den);
        }
    }

    function setFeeRatio(address _sender, uint256 _num, uint256 _den)
        public
    {
        Factorial storage factorial = feeRatios[_sender];
        factorial.num = _num;
        factorial.den = _den;
    }

    function closingPrices(address _sellToken, address _buyToken, uint256 _lastAuctionIndex)
        public
        returns (uint256, uint256)
    {
        // Get Factorial
        Factorial storage factorial = closingPrice[_sellToken][_buyToken][_lastAuctionIndex];


        if (factorial.num == 0 && factorial.den == 0)
        {
            factorial.num = 1000;
            factorial.den = 10;
            return (factorial.num, factorial.den);
        }
        else
        {
            return (factorial.num, factorial.den);
        }
    }

    function setclosingPrices(address _sellToken, address _buyToken, uint256 _lastAuctionIndex, uint256 _num, uint256 _den)
        public
        returns (uint256, uint256)
    {
        // Get Factorial
        Factorial storage factorial = closingPrice[_sellToken][_buyToken][_lastAuctionIndex];

        factorial.num = _num;
        factorial.den = _den;
        return (factorial.num, factorial.den);
    }

    function depositAndSell(address _sellToken, address _buyToken, uint256 _sellAmount)
        public
        returns (bool)
    {
        require(safeTransfer(tokenAddress, msg.sender, amount, true), "The deposit transaction must succeed");
        return true;
    }

    function claimAndWithdraw(address _sellToken, address _buyToken, address _user, uint256 _claimAmount)
        public
        returns (bool)
    {
        //require(safeTransfer(tokenAddress, msg.sender, amount, true), "The deposit transaction must succeed");
        return true;
    }

}