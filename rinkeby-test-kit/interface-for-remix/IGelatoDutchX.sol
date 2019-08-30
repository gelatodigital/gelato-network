pragma solidity ^0.5.0;


// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
interface IGelatoDutchX {
    // IOwnable.sol
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /**
     * @dev Returns the address of the current owner.
     */
    function owner() external view returns (address);

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() external view returns (bool);

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() external;

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) external;


    // IIcedout.sol
     // Max Gas for one execute + withdraw pair => fixed.
     function interfaceMaxGas() external view returns(uint256);
     // To adjust prePayment, use gasPrice
     function interfaceGasPrice() external view returns(uint256);


     // Events
     event LogGelatoBalanceAdded(uint256 amount,
                                 uint256 gelatoBalancePost,
                                 uint256 interfaceBalancePost
     );
     event LogGelatoBalanceWithdrawn(uint256 amount,
                                     uint256 gelatoBalancePost,
                                     uint256 interfaceBalancePost
     );
     event LogBalanceWithdrawnToOwner(uint256 amount,
                                      uint256 interfaceBalancePost,
                                      uint256 ownerBalancePost
     );


     // Function to calculate the prepayment an interface needs to transfer to Gelato Core
     // for minting a new execution executionClaim
     function calcGelatoPrepayment() external view returns(uint256);

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato() external payable;

     // Withdraw Balance from gelatoCore to interface
     function withdrawBalanceFromGelato(uint256 _withdrawAmount) external;
     // Withdraw funds from interface to owner
     function withdrawBalanceToOwner(uint256 _withdrawAmount) external;

     // Withdraw funds from interface to owner
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount) external;


     // Create function signature from canonical form and execution claim
     function mintExecutionClaim(string calldata _function, address _user) external returns (uint256, bytes memory);

     // Switch from querying gelatoCore's gas price to using an interface specific one
     function useInterfaceGasPrice(uint256 _interfaceGasPrice) external;

     // Switch from using interface specific gasPrice to fetching it from gelato core
     function useRecommendedGasPrice() external;


    // GELATO_DUTCHX.sol
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
    function gelatoCore() external view returns(address);

    // One orderState struct can have many sellOrder structs as children

    function dutchExchange() external view returns(address);

    // OrderId => parent orderState struct
    // function orderStates(uint256 _orderId) external view returns(OrderState memory);

    // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
    // function sellOrders(uint256 _withdrawClaimId, uint256 _depositAndSellClaimId) external view returns(SellOrder memory);

    // Constants that are set during contract construction and updateable via setters
    function auctionStartWaitingForFunding() external view returns(uint256);
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
    function execDepositAndSell(uint256 _executionClaimId) external;
    // **************************** IcedOut execute(executionClaimId) END *********************************

    // DELETE
    // ****************************  execWithdraw(executionClaimId) *********************************
    // Withdraw function executor will call
    function execWithdraw(uint256 _executionClaimId) external;
    // ****************************  execWithdraw(executionClaimId) END *********************************


    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel heloer on IcedOut.sol
    // DELETE
    function cancelOrder(uint256 _executionClaimId) external;

    // Allows manual withdrawals on behalf of a seller from any calling address
    // @DEV: Gas Limit Change => Hardcode
    // DELETE
    function withdrawManually(uint256 _executionClaimId) external;


    // **************************** Helper functions *********************************
    // Calculate sub order size accounting for current dutchExchange liquidity contribution fee.
    function _calcActualSellAmount(uint256 _subOrderSize)
        external
        returns(uint256, uint256);


    // DEV Calculates sellAmount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken,
                                 address _buyToken,
                                 uint256 _lastAuctionIndex,
                                 uint256 _sellAmountAfterFee
    )
        external
        returns(uint256);
}


