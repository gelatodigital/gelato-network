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
        bool chained;
        address dappInterface;
        bytes32 parentOrderHash;
        address sellToken;
        address buyToken;
        uint256 orderSize;
        uint256 executionTime;
        uint256 executorReward;
    }

    // **************************** Events **********************************
    event LogNewClaimMinted(address indexed dappInterface,
                            address indexed owner,
                            uint256 indexed claimId,
                            uint256 executorReward
    );
    event LogClaimUpdated(address indexed dappInterface,
                          address indexed owner,
                          uint256 indexed claimId,
                          uint256 orderSize,
                          uint256 executionTime,
                          uint256 executorReward

    );
    event LogNewInterfaceListed(address indexed dappInterface);
    event LogClaimBurned(address indexed dappInterface,
                         address indexed owner,
                         uint256 indexed claimId,
                         uint256 executorReward
    );
    event LogExecutorPayout(address indexed dappInterface,
                            address payable indexed executor,
                            bytes32 parentOrderHash,
                            uint256 indexed executorReward
    );
    // **************************** Events END **********************************


    // **************************** State Variables **********************************
    // Whitelist of Dapp Interfaces
    mapping(address => bool) public interfaceWhitelist;

    // claimID => Claim
    mapping(uint256 => Claim) public claims;

    // owner => ClaimIDs[]
    mapping(address => uint256[]) public claimsByOwner;

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


    // **************************** Modifiers ******************************
    // Only claim owners
    modifier onlyClaimOwner(uint256 _claimId) {
        require(ownerOf(_claimId) == msg.sender,
            "onlyClaimOwner: msg.sender is not the owner of the claim"
        );
        _;
    }

    // Only whitelisted interfaces
    modifier onlyWhitelistedInterfaces(address _dappInterface) {
        require(interfaceWhitelist[_dappInterface],
            "The calling dappInterface is not whitelisted in Gelato Core"
        );
        _;
    }
    // **************************** Modifiers END ******************************

    // CREATE
    // **************************** mintClaim() ******************************
    function mintClaim(bool _chained,
                       bytes32 _parentOrderHash,
                       address _owner,
                       address _sellToken,
                       address _buyToken,
                       uint256 _orderSize,
                       uint256 _executionTime,
                       uint256 _executorReward
    )
        onlyWhitelistedInterfaces(msg.sender)  // msg.sender==dappInterface
        payable
        public
        returns (bool)
    {
        // Step1: Make sure interface endows Gelato Core with executorReward ether
        require(msg.value == _executorReward,
            "mintClaim: msg.value != executorReward"
        );


        // Step2.1: Zero value preventions
        require(_owner != address(0), "Trader: No zero addresses allowed");
        require(_sellToken != address(0), "sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "buyToken: No zero addresses allowed");
        require(_orderSize != 0, "childOrderSize cannot be 0");
        // Step2.2: Valid execution Time check
        require(_executionTime >= now, "Failed test: _executionTime >= now");


        // Step3: Instantiate claim (in memory)
        Claim memory claim = Claim(
            _chained,
            msg.sender,  // dappInterface
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
        _mint(_owner, claimId);
        // ****** Step4: Mint new claim ERC721 token END ******


        // Step5: Claims tracking state variable update
        // ERC721(claimId) => Claim(struct)
        claims[claimId] = claim;
        // Trader => ERC721s(claimIds)
        claimsByOwner[_owner].push(claimId);


        // Step6: Emit event to notify executors that a new sub order was created
        emit LogNewClaimMinted(msg.sender,  // dappInterface
                               _owner,
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
        returns(bool chained,
                address dappInterface,
                bytes32 parentOrderHash,
                address owner,
                address sellToken,
                address buyToken,
                uint256 orderSize,
                uint256 executionTime,
                uint256 executorReward
        )
    {
        Claim memory claim = claims[_claimId];

        return (claim.chained,
                claim.dappInterface,
                claim.parentOrderHash,
                ownerOf(_claimId), // fetches owner of the claim token
                claim.sellToken,
                claim.buyToken,
                claim.orderSize,
                claim.executionTime,
                claim.executorReward
        );
    }

    // **************************** getClaim() END ******************************


    // UPDATE
    // **************************** Core Updateability ***************************
    function listInterface(address _dappInterface)
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == address(0),
            "listInterface: Dapp Interface already whitelisted"
        );

        interfaceWhitelist[_dappInterface] = true;

        emit LogNewInterfaceListed(_dappInterface);
    }
    // **************************** Core Updateability END ******************************

    // **************************** Claims Updateability ***************************
    // Only increase possible - decrease would entail Core -> User refund logic
    function increaseExecutorReward(uint256 _claimId, uint256 _amount)
        onlyClaimOwner(_claimId)
        payable
        external
    {
        require(msg.value == _amount,
            "increaseExecutorReward: msg.value != _amount"
        );

        Claim storage claim = claims[_claimId];

        claim.executorReward.add(_amount);

        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _owner,
                             claimId,
                             claim.orderSize,
                             claim.executionTime,
                             claim.executorReward
        );
    }

    // Only increase because decrease would be like Order Cancellation
    function increaseOrderSize(uint256 _claimId, uint256 _amount)
        onlyClaimOwner(_claimId)
        external
    {
        Claim storage claim = claims[_claimId];

        // 2-steps needed due to (suboptimal) ERC20 design - otherwise Core would trigger transferFrom
        //  msg.sender -> dappInterface directly.
        // Core needs to be transfer agent in order to ensure that the dappInterface gained the ERC20s.
        // First we must transfer the tokens from the msg.sender(Owner) to the Core Protocol
        // This is hardcoded into safeTransfer in the from==true control flow.
        require(safeTransfer(claim.sellToken, claim.dappInterface, _amount, true),
            "increaseOrderSize: The transfer of sellTokens from ClaimOwner to Gelato Core must succeed"
        );
        // Second we transfer the tokens from the Core Protocol to the Dapp Interface
        require(safeTransfer(claim.sellToken, claim.dappInterface, _amount, false),
            "increaseOrderSize: The transfer of sellTokens from Gelato Core to the dappInterface must succeed"
        );

        claim.orderSize.add(_amount);

        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _owner,
                             claimId,
                             claim.orderSize,
                             claim.executionTime,
                             claim.executorReward
        );
    }

    function updateExecutionTime(uint256 _claimId, uint256 _executionTime)
        onlyClaimOwner(_claimId)
        external
    {
        require(now <= _executionTime,
            "updateExecutionTime: now not <= executionTime"
        );

        Claim storage claim = claims[_claimId];

        claim.executionTime = _executionTime;

        emit LogClaimUpdated(msg.sender,  // msg.sender == interface
                             _owner,
                             claimId,
                             claim.orderSize,
                             claim.executionTime,
                             claim.executorReward
        );
    }
    // **************************** Claims Updateability END ******************************


    // DELETE
    // **************************** burnClaim() ***************************
    function burnClaim(uint256 _claimId)
        private
    {
        _burn(_claimId);
        emit LogClaimBurned(msg.sender,  // msg.sender == interface
                            _owner,
                            claimId,
                            _executorReward
        );
    }
    // **************************** burnClaim() END ***************************



    // **************************** payExecutor() ***************************
    // This should be called for all normal (unchaiend) Claims. Executor Payout and END
    function payExecutor(address payable _executor, uint256 _claimId)
        onlyWhiteListedInterface(msg.sender)  // msg.sender == dappInterface
        external
    {
        Claim memory claim = claims[_claimId];

        // Checks:
        require(claim.dappInterface == msg.sender,
            "payExecutor: msg.sender must be the dappInterface to the executed Claim"
        );
        require(!claim.chained,
            "payExecutor: cannot execute chained claims"
        );

        // Effects
        burnClaim(_claimId);

        // Interactions
        _executor.transfer(claim.executorReward);
    }
    // **************************** payExecutor() END ***************************


    // **************************** payExecutorAndMint() ***************************
    // This should only be called for Chained Claims: Executor Payout and mint chained claim.
    // We pass all the parameters again to payExecutorAndMint, instead of using
    //  e.g. claim._sellToken etc, to generalise and open up to all sorts of use cases.
    // The safety of this logic is thus NOT encoded into the core and needs to be
    //  audited on the interface level.
    // --> Trade-off: Sacrificing Core-enforced Security for broad interface usability.
    function payExecutorAndMint(address payable _executor,
                                uint256 _claimId,
                                bool _chained,
                                bytes32 _parentOrderHash,
                                address _owner,
                                address _sellToken,
                                address _buyToken,
                                uint256 _orderSize,
                                uint256 _executionTime,
                                uint256 _executorReward
    )
        onlyWhiteListedInterface(msg.sender)  // msg.sender == dappInterface
        payable
        external
    {
        Claim memory claim = claims[_claimId];

        // Checks:
        require(claim.dappInterface == msg.sender,
            "payExecutorAndMint: msg.sender must be the dappInterface to the executed Claim"
        );
        require(claim.chained,
            "payExecutorAndMint: only executes chained claims"
        );

        // Effects
        burnClaim(_claimId);
        // Possible further effects: deleting claim from mappings?
        mintClaim(_chained,
                  _parentOrderHash,
                  _owner,
                  _sellToken,
                  _buyToken,
                  _orderSize,
                  _executionTime,  // safe logic via interface only e.g. 24h freeze time == auction cleared
                  _executorReward
        );

        // Interactions
        _executor.transfer(claim.executorReward);
    }
    // **************************** payExecutorAndMint() END ***************************

}


