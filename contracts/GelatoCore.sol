pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import "./base/SafeTransfer.sol";


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
        uint256 executorReward;
    }

    // Events
    event LogNewClaimMinted(address indexed dappInterface,
                            address indexed trader,
                            uint256 indexed claimId,
                            uint256 executorReward
    );
    event LogClaimUpdated(address indexed dappInterface,
                          address indexed trader,
                          uint256 indexed claimId,
                          uint256 executorReward
    );
    event LogClaimBurned(address indexed dappInterface,
                         address indexed trader,
                         uint256 indexed claimId,
                         uint256 executorReward
    );
    event LogExecutorPayout(address indexed dappInterface,
                            address payable indexed executor,
                            bytes32 parentOrderHash,
                            uint256 indexed executorReward
    );


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
                       uint256 _executionTime,
                       uint256 _executorReward
    )
        external
        payable
        returns (bool)
    {
        // Step1: Make sure interface endows Gelato Core with executorReward ether
        require(msg.value == _executorReward,
            "mintClaim: msg.value != executorReward"
        );


        // Step2: Zero value preventions
        require(_trader != address(0), "Trader: No zero addresses allowed");
        require(_sellToken != address(0), "sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "buyToken: No zero addresses allowed");
        require(_orderSize != 0, "childOrderSize cannot be 0");
        require(_executionTime >= now, "Failed test: _executionTime >= now");


        // Step3: Instantiate claim (in memory)
        Claim memory claim = Claim(
            msg.sender,
            _parentOrderHash,
            _sellToken,
            _buyToken,
            _orderSize,
            _executionTime,
            _executorReward
        );


        // ****** Step4: Mint new claim ERC721 token ******
        // Increment the current token id
        Counters.increment(_claimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 claimId = _claimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_trader, claimId);
        // ****** Step4: Mint new claim ERC721 token END ******


        // Step5: ERC721(claimId) => Claim(struct)
        // Store each childOrder in childOrders state variable mapping
        claims[claimId] = claim;
        // Store each childOrder in childOrdersByTrader array by their hash
        claimsByTrader[_trader].push(claimId);


        // Step6: Emit event to notify executors that a new sub order was created
        emit LogNewClaimMinted(msg.sender,  // msg.sender == interface
                               _trader,
                               claimId,
                               _executorReward
        );


        // Step7: Return true to caller (dappInterface)
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
    // **************************** Claims Updateability ***************************
    // Only claim owner can update claim
    modifier onlyClaimOwnerOrInterface(_claimId) {
        require(claims[_claimId].dappInterface == msg.sender || ownerOf(_claimId) == msg.sender,
            "updateClaim: msg.sender is not the owner, nor the interface to the claim"
        );
        _;
    }

    function increaseClaimOrderSize(uint256 _claimId, uint256 _amount)
        onlyClaimOwnerOrInterface(_claimId)
        external
    {
        Claim storage claim = claims[_claimId];

        // First we must transfer the tokens from the msg.sender to the Core Protocol
        require(safeTransfer(claim.sellToken, claim.dappInterface, _amount, true),
            "splitSellOrder: The transfer of sellTokens to Gelato Core must succeed"
        );
        // Second we transfer the tokens from the Core Protocol to the Dapp Interface
        require(safeTransfer(claim.sellToken, claim.dappInterface, _amount, false),
            "splitSellOrder: The transfer of sellTokens to the dappInterface must succeed"
        );

        claim.orderSize = _orderSize;
        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _trader,
                             claimId,
                             _executorReward
        );
    }

    function updateClaimExecutionTime(uint256 _claimId, uint256 _executionTime)
        onlyClaimOwnerOrInterface(_claimId)
        external
    {
        require(now <= _executionTime,
            "increaseExecutorReward: now not <= executionTime"
        );

        Claim storage claim = claims[_claimId];

        claim.executionTime = _executionTime;

        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _trader,
                             claimId,
                             _executorReward
        );
    }

    function increaseExecutorReward(uint256 _claimId, uint256 _amount)
        onlyClaimOwnerOrInterface(_claimId)
        payable
        external
    {
        require(msg.value == _amount,
            "increaseExecutorReward: msg.value != _amount"
        );

        Claim storage claim = claims[_claimId];

        claim.executorReward.add(_amount);

        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _trader,
                             claimId,
                             _executorReward
        );
    }
    // **************************** Claims Updateability END ******************************


    // DELETE
    // **************************** burnClaim() ***************************
    function burnClaim(uint256 _claimId)
        public
    {
        _burn(_claimId);  // requires ownership
        emit LogClaimBurned(msg.sender,  // msg.sender == interface
                            _trader,
                            claimId,
                            _executorReward
        );
    }
    // **************************** burnClaim() END ***************************

    // Executor Reward
    function payExecutor(address payable _executor, uint256 _executorReward)
        external
    {
        // Checks
        // Caller must be registered interface
        require()

        // Effects

        // Interactions
        _executor.transfer(_executorReward);
    }
}


