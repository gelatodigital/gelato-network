pragma solidity ^0.5.0;

//  Imports:
import './IIcedOut.sol';

// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
contract IGelatoDutchX is IIcedOut {
    // **************************** Events ******************************
    event LogNewOrderCreated(uint256 indexed orderStateId, address indexed seller);
    event LogFeeNumDen(uint256 num, uint256 den);
    event LogActualSellAmount(uint256 indexed executionClaimId,
                              uint256 indexed orderId,
                              uint256 subOrderAmount,
                              uint256 actualSellAmount,
                              uint256 dutchXFee
    );
    event LogOrderCancelled(uint256 indexed executionClaimId,
                            uint256 indexed orderID,
                            address indexed seller
    );
    event LogWithdrawComplete(uint256 indexed executionClaimId,
                              uint256 indexed orderId,
                              address indexed seller,
                              address buyToken,
                              uint256 withdrawAmount
    );
    event LogOrderCompletedAndDeleted(uint256 indexed orderId);
    event LogWithdrawAmount(uint256 num, uint256 den, uint256 withdrawAmount);
    event LogGas(uint256 gas1, uint256 gas2);
    // **************************** Events END ******************************

    // base contract => Ownable => indirect use through IcedOut
    // Libraries
    // using SafeMath for uint256; => indirect use through IcedOut

    // One OrderState to many SellOrder
    /*struct OrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
    }*/

    // One SellOrder to one parent OrderState
    /*struct SellOrder {
        bool posted;
        uint256 executionTime; // Condition for execution
        uint256 orderStateId; // Link to parent OrderState
        uint256 prepaymentPerSellOrder; // interfaceMaxGas * interface||gelato-GasPrice
        address sellToken; // token to sell
        address buyToken; // token to buy
        uint256 sellAmount; // sellAmount to be posted
    }*/

    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    // GelatoCore external gelatoCore;

    // One orderState struct can have many sellOrder structs as children

    // OrderId => parent orderState struct
    // function orderStates(uint256 _orderId) public view returns(OrderState memory);

    // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
    // function sellOrders(uint256 _withdrawClaimId, uint256 _depositAndSellClaimId) public view returns(SellOrder memory);

    // Constants that are set during contract construction and updateable via setters
    function auctionStartWaitingForFunding() public view returns(uint256);
    // **************************** State Variables END ******************************

    // **************************** State Variable Setters ******************************
    function setAuctionStartWaitingForFunding(uint256 _auctionStartWaitingForFunding) external;
    // **************************** State Variable Setters END ******************************

    // Create
    // **************************** timedSellOrders() ******************************
    function timedSellOrders(address _sellToken,
                             address _buyToken,
                             uint256 _totalSellVolume,
                             uint256 _numSellOrders,
                             uint256 _amountPerSellOrder,
                             uint256 _executionTime,
                             uint256 _intervalSpan
    )
        external
        payable;
    // **************************** timedSellOrders() END ******************************


    // UPDATE-DELETE
    // ****************************  execDepositAndSell(executionClaimId) *********************************
    /**
     * DEV: Called by the execute func in GelatoCore.sol
     * Aim: Post sellOrder on the DutchExchange via depositAndSell()
     */
    function execDepositAndSell(uint256 _executionClaimId) public;
    // **************************** IcedOut execute(executionClaimId) END *********************************

    // DELETE
    // ****************************  execWithdraw(executionClaimId) *********************************
    // Withdraw function executor will call
    function execWithdraw(uint256 _executionClaimId) public;
    // ****************************  execWithdraw(executionClaimId) END *********************************


    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel heloer on IcedOut.sol
    // DELETE
    function cancelOrder(uint256 _executionClaimId) public;

    // Allows manual withdrawals on behalf of a seller from any calling address
    // @DEV: Gas Limit Change => Hardcode
    // DELETE
    function withdrawManually(uint256 _executionClaimId) public;


    // **************************** Helper functions *********************************
    // Calculate sub order size accounting for current dutchExchange liquidity contribution fee.
    function _calcActualSellAmount(uint256 _subOrderSize)
        public
        returns(uint256 actualSellAmount, uint256 dutchXFee);


    // DEV Calculates sellAmount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken,
                                 address _buyToken,
                                 uint256 _lastAuctionIndex,
                                 uint256 _sellAmountAfterFee
    )
        public
        returns(uint256 withdrawAmount);
}


