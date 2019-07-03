pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/Ownable.sol';
import './base/SafeMath.sol';
import './ERC721/Claim.sol';


contract GelatoCore is Ownable, Claim {

    // Libraries used:
    // using Counters for Counters.Counter;

    // No need to add SafeMath, as we inherit it from ERC721
    // using SafeMath for uint256;

    Counters.Counter private _tokenIds;

    struct Claim {
        address gelatoInterface;
        bytes32 parentOrderHash;
        address sellToken;
        address buyToken;
        uint256 orderSize;
        uint256 executionTime;
    }

    // Events
    event LogNewChildOrderCreated(address indexed dappInterface,  // IMPORTANT FILTER: executor's main choice
                                  address trader,  // no filter: logic via parentOrderHash
                                  uint256 indexed tokenId  // no filter: can all be retrieved via parentOrderHash
    );

    event LogTokenBurned(uint256 indexed tokenId);


    // **************************** State Variables **********************************

    // token ID => childOrder (rather than childOrderHash => childOrder)
    mapping(uint256 => Claim) public claims;

    // trader => childOrders
    mapping(address => uint256[]) public claimsByTrader;

    // #### Inherited mappings from ERC721 ####

    // // Mapping from token ID to owner
    // mapping (uint256 => address) private _tokenOwner;

    // // Mapping from token ID to approved address
    // mapping (uint256 => address) private _tokenApprovals;

    // // Mapping from owner to number of owned token
    // mapping (address => Counters.Counter) private _ownedTokensCount;

    // // Mapping from owner to operator approvals
    // mapping (address => mapping (address => bool)) private _operatorApprovals;

    // #### Inherited mappings from ERC721 END ####

    // **************************** State Variables END ******************************

    // **************************** ERC721 Constructor *******************************

    // **************************** ERC721 Constructor END ***************************

    // **************************** State Variable Getters ***************************

    function getClaim(uint256 _tokenId)
        public
        view
        returns(
            address gelatoInterface,
            bytes32 parentOrderHash,
            address trader,
            address sellToken,
            address buyToken,
            uint256 orderSize,
            uint256 executionTime

        )
    {
        Claim memory claim = claims[_tokenId];
        return
        (
            claim.gelatoInterface,
            claim.parentOrderHash,
            ownerOf(_tokenId), // fetches owner of the claim token
            claim.sellToken,
            claim.buyToken,
            claim.orderSize,
            claim.executionTime
        );
    }

    // **************************** State Variable Getters END ******************************


    // **************************** splitSchedule() ******************************
    function createClaims(bytes32 _parentOrderHash,
                           address _trader,
                           address _sellToken,
                           address _buyToken,
                           uint256 _totalOrderVolume,
                           uint256 _numChildOrders,
                           uint256 _orderSize,
                           uint256 _executionTime,
                           uint256 _intervalSpan
    )
        external
        returns (bool)
    {
        // Zero value preventions
        require(_trader != address(0), "Trader: No zero addresses allowed");
        require(_sellToken != address(0), "sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "buyToken: No zero addresses allowed");
        require(_totalOrderVolume != 0, "totalOrderVolume cannot be 0");
        require(_numChildOrders != 0, "numChildOrders cannot be 0");
        require(_orderSize != 0, "childOrderSize cannot be 0");

        /* Invariants requirements
            * 1: childOrderSizes from one parent order are constant.
                * totalOrderVolume == numChildOrders * childOrderSize.
        */

        // @DEV: capping number of child orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs

        // Invariant1: Constant childOrderSize
        require(_totalOrderVolume == _numChildOrders.mul(_orderSize),
            "Failed Invariant1: totalOrderVolume = numChildOrders * childOrderSize"
        );


        // Local variable for reassignments to the executionTimes of
        // sibling child orders because the former differ amongst the latter.
        uint256 executionTime = _executionTime;

        // Create all childOrders
        for (uint256 i = 0; i < _numChildOrders; i++) {
            // Instantiate (in memory) each childOrder (with its own executionTime)
            Claim memory claim = Claim(
                msg.sender,
                _parentOrderHash,
                _sellToken,
                _buyToken,
                _orderSize,
                executionTime  // Differs across siblings
            );

            // ### Mint new claim ERC721 token ###

            // Increment the current token id
            Counters.increment(_tokenIds);

            // Get a new, unique token id for the newly minted ERC721
            uint256 tokenId = _tokenIds.current();

            // Mint new ERC721 Token representing one childOrder
            _mint(_trader, tokenId);

            // ### Mint new claim ERC721 token END ###

            // CONNECTION BETWEEN claim AND ERC721
            // Store each childOrder in childOrders state variable mapping
            claims[tokenId] = claim;

            // Store each childOrder in childOrdersByTrader array by their hash
            claimsByTrader[_trader].push(tokenId);

            // Emit event to notify executors that a new sub order was created
            emit LogNewChildOrderCreated(msg.sender,  // == the calling interface
                                         _trader,
                                         tokenId
            );

            // Increment the execution time
            executionTime += _intervalSpan;
        }

        // Return true to caller (dappInterface)
        return true;
    }
    // **************************** splitSchedule() END ******************************

    function burnClaim(uint256 tokenId)
        public
    {
        _burn(tokenId);
        emit LogTokenBurned(tokenId);
    }



}


