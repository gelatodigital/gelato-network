pragma solidity ^0.5.10;

import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
import '../GelatoCore.sol';
import '../base/ERC20.sol';

// Trigger for Gelato Protocol
// Aim: Checks if inputted timestamp is lower than now

contract SellOnDutchX {

    string constant sellOnDutchXString = "sellOnDutchX(address,address,uint256)";

    DutchExchange public dutchExchange;

    GelatoCore public gelatoCore;

    constructor(address payable _GelatoCore, address _DutchExchange)
        // Initialize gelatoCore address & maxGas in IcedOut parent
        public
    {
        gelatoCore = GelatoCore(_GelatoCore);
        dutchExchange = DutchExchange(_DutchExchange);
    }

    function sellOnDutchX(address _sellToken, address _buyToken, uint256 _sellAmount)
        public
        returns(bool)
    {
        // require(msg.sender == gelatoCore);
        // return true if timestamp is Smaller than now
        // Approve DutchX to transfer the funds from gelatoInterface
        ERC20(_sellToken).approve(address(dutchExchange), _sellAmount);

        // DEV deposit and sell on the dutchExchange
        dutchExchange.depositAndSell(_sellToken, _buyToken, _sellAmount);
        return true;
    }

}