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

    Counters.Counter private _claimIds;

    struct Claim {
        address dappInterface;
        bytes32 parentOrderHash;
        address sellToken;
        address buyToken;
        uint256 orderSize;
        uint256 executionTime;
    }

    // Events
    event LogNewClaimMinted(address indexed dappInterface,
                            address indexed trader,
                            uint256 indexed claimId
    );

    event LogClaimUpdated(uint256 indexed claimId);

    event LogClaimBurned(uint256 indexed claimId);


    // **************************** State Variables **********************************

    // claimID => Claim
    mapping(uint256 => Claim) public claims;

    // trader => ClaimIDs[]
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


    // CREATE
    // **************************** mintClaim() ******************************
    function mintClaim(bytes32 _parentOrderHash,
                       address _trader,
                       address _sellToken,
                       address _buyToken,
                       uint256 _orderSize,
                       uint256 _executionTime
    )
        external
        payable
        returns (bool)
    {
        // Zero value preventions
        require(_trader != address(0), "Trader: No zero addresses allowed");
        require(_sellToken != address(0), "sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "buyToken: No zero addresses allowed");
        require(_orderSize != 0, "childOrderSize cannot be 0");
        require(_executionTime >= now, "Failed test: _executionTime >= now");

        // Instantiate (in memory) each childOrder (with its own executionTime)
        Claim memory claim = Claim(
            msg.sender,
            _parentOrderHash,
            _sellToken,
            _buyToken,
            _orderSize,
            _executionTime  // Differs across siblings
        );

        // ### Mint new claim ERC721 token ###

        // Increment the current token id
        Counters.increment(_claimIds);

        // Get a new, unique token id for the newly minted ERC721
        uint256 claimId = _claimIds.current();

        // Mint new ERC721 Token representing one childOrder
        _mint(_trader, claimId);

        // ### Mint new claim ERC721 token END ###

        // CONNECTION BETWEEN claim AND ERC721
        // Store each childOrder in childOrders state variable mapping
        claims[claimId] = claim;

        // Store each childOrder in childOrdersByTrader array by their hash
        claimsByTrader[_trader].push(claimId);

        // Emit event to notify executors that a new sub order was created
        emit LogNewClaimMinted(msg.sender,  // == the calling interface
                               _trader,
                               claimId
        );


        // Return true to caller (dappInterface)
        return true;
    }
    // **************************** mintClaim() END ******************************

    // READ
    // **************************** getClaim() ***************************
    function getClaim(uint256 _claimId)
        public
        view
        returns(address dappInterface,
                bytes32 parentOrderHash,
                address trader,
                address sellToken,
                address buyToken,
                uint256 orderSize,
                uint256 executionTime
        )
    {
        Claim memory claim = claims[_claimId];

        return (claim.dappInterface,
                claim.parentOrderHash,
                ownerOf(_claimId), // fetches owner of the claim token
                claim.sellToken,
                claim.buyToken,
                claim.orderSize,
                claim.executionTime
        );
    }

    // **************************** getClaim() END ******************************


    // UPDATE
    // **************************** updateClaim() ***************************
    function updateClaim(uint256 _claimId,
                         uint256 _orderSize,
                         uint256 _executionTime
    )
        public
    {
        Claim storage claim = claims[_claimId];
        claim.orderSize = _orderSize;
        claim.executionTime = _executionTime;
        emit LogClaimUpdated(_claimId);
    }
    // **************************** updateClaim() END ******************************


    // DELETE
    // **************************** burnClaim() ***************************
    function burnClaim(uint256 _claimId)
        public
    {
        _burn(_claimId);
        emit LogClaimBurned(_claimId);
    }
    // **************************** burnClaim() END ***************************


}


