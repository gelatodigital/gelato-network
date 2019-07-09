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
        uint256 executionGas;
        uint256 executionPrepaid;
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
    event LogUpdatedInterfaceExecPrepaid(address indexed dappInterface);
    event LogUpdatedInterfaceExecGas(address indexed dappInterface);
    event LogClaimBurned(address indexed dappInterface,
                         address indexed owner,
                         uint256 indexed claimId
    );
    event LogExecutorPayout(address indexed dappInterface,
                            address payable indexed executor,
                            bool indexed gelatoDrip,
                            uint256 executorReward
                            bytes32 parentOrderHash,
    );
    // **************************** Events END **********************************



    // **************************** State Variables **********************************
    // Whitelist of Dapp Interfaces
    mapping(address => bool) public interfaceWhitelist;

    // claimID => Claim
    mapping(uint256 => Claim) public claims;

    // owner => ClaimIDs[]
    mapping(address => uint256[]) public claimsByOwner;

    //_____________ Gelato Core execution market logic ________________
    /* The interface-specific execPrepaid:
    execPrepaidByInterfaceClaim[dappInterface][claimTypeIndex]
    should to pay for (lest we operate with losses):
        1) The gas costs incurred by an executor:
           executionGasByInterfaceClaim[dappInterface][claimTypeIndex] * gasPrice (from oracle)
        2) The core protocol defined executorProfit
        3) The core protocol executorRewardPoolContribution
    */
    // Set upon interface whitelisting:
    // dappInterface => claimType => gelatoFee
    mapping(address => mapping(uint256 => uint256)) public execPrepaidByInterfaceClaim;
    // dappInterface => claimType => executionGas
    mapping(address => mapping(uint256 => uint256)) public execGasByInterfaceClaim;

    // The gas price oracle defined variable gas price
    uint256 public gasPrice;

    // The core protocol governance defined profit from executing any claim
    uint256 public executorProfit;

    // The core protocol governance defined contribution to the protocols execution reward pool
    // Payable by dapp interfaces
    uint256 public executorRewardPoolContribution;
    //_____________ Gelato Core execution market logic END ________________
    // **************************** State Variables END ******************************



    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _gasPrice, uint256 _executorProfit, uint256 _executorRewardPoolContribution)
        public
    {
        // Initialise declared-only state variables
        gasPrice = _gasPrice;
        executorProfit = _executorProfit;
        executorRewardPoolContribution = _executorRewardPoolContribution;
    }
    // **************************** Gelato Core constructor() END *****************************



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
            "onlyWhitelistedInterfaces: The calling dappInterface is not whitelisted in Gelato Core"
        );
        _;
    }
    // **************************** Modifiers END ******************************



    // CREATE
    // **************************** mintClaim() ******************************
    function mintClaim(bytes32 _parentOrderHash,
                       address _claimOwner,
                       address _sellToken,
                       address _buyToken,
                       uint256 _orderSize,
                       uint256 _executionTime,
                       uint256 _claimType
    )
        onlyWhitelistedInterfaces(msg.sender)  // msg.sender==dappInterface
        payable
        public
        returns (bool)
    {
        // Step1.1: Zero value preventions
        require(_claimOwner != address(0), "GelatoCore.mintClaim: _claimOwner: No zero addresses allowed");
        require(_sellToken != address(0), "GelatoCore.mintClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintClaim: _buyToken: No zero addresses allowed");
        require(_orderSize != 0, "GelatoCore.mintClaim: _orderSize cannot be 0");
        // Step1.2: Valid execution Time check
        require(_executionTime >= now, "GelatoCore.mintClaim: Failed test: _executionTime >= now");

        // Step2: Require that interface transfers the correct execution prepayment
        require(msg.value == execPrepaidByInterfaceClaim[_claimType],
            "GelatoCore.mintClaim: msg.value != execPrepaidByInterfaceClaim[_claimType]"
        );

        // Step3: Instantiate claim (in memory)
        Claim memory claim = Claim(
            msg.sender,  // dappInterface
            _parentOrderHash,
            _sellToken,
            _buyToken,
            _orderSize,
            _executionTime,
            execGasByInterfaceClaim[_claimType],  // execution gasCost
            msg.value  // execPrepaidByInterfaceClaim[_claimType]
        );


        // ****** Step4: Mint new claim ERC721 token ******
        // Increment the current token id
        Counters.increment(_claimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 claimId = _claimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_claimOwner, claimId);
        // ****** Step4: Mint new claim ERC721 token END ******


        // Step5: Claims tracking state variable update
        // ERC721(claimId) => Claim(struct)
        claims[claimId] = claim;
        // Trader => ERC721s(claimIds)
        claimsByOwner[_claimOwner].push(claimId);


        // Step6: Emit event to notify executors that a new sub order was created
        emit LogNewClaimMinted(msg.sender,  // dappInterface
                               _claimOwner,
                               claimId,
                               msg.value
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
                address owner,
                address sellToken,
                address buyToken,
                uint256 orderSize,
                uint256 executionTime,
                uint256 executionGas
        )
    {
        Claim memory claim = claims[_claimId];

        return (claim.dappInterface,
                claim.parentOrderHash,
                ownerOf(_claimId), // fetches owner of the claim token
                claim.sellToken,
                claim.buyToken,
                claim.orderSize,
                claim.executionTime,
                claim.executionGas
        );
    }

    // **************************** getClaim() END ******************************



    // UPDATE
    // **************************** Core Updateability ***************************
    // @Dev: we can separate Governance fns into a base contract and inherit from it
    function registerInterface(address _dappInterface,
                               uint256 _claimTypes,
                               uint256[] _prepayments,
                               uint256[] _executionGas
    )
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == address(0),
            "listInterface: Dapp Interface already whitelisted"
        );

        for (uint256 i = 0; i < _claimTypes; i++) {
            // Set each of the interface's claim types execution prepayment
            execPrepaidByInterfaceClaim[_dappInterface][i] = _prepayments[i];

            // Set each of the claim types executionGas
            execGasByInterfaceClaim[_dappInterface][i] = _executionGas[i];
        }

        // Whitelist the dappInterface
        interfaceWhitelist[_dappInterface] = true;

        emit LogNewInterfaceListed(_dappInterface);
    }

    // Governance function to update the prepayments an interface needs to supply for its claims
    function updateInterfaceExecPrepaid(address _dappInterface,
                                        uint256[] _claimTypes,
                                        uint256[] _prepayments
    )
        onlyOwner
        public
    {

        for (uint256 i = 0; i < _claimTypes.length; i++) {
            // Set each of the requested claim types execution prepayment
            execPrepaidByInterfaceClaim[_dappInterface][_claimTypes[i]] = _prepayments[i];
        }

        emit LogUpdatedInterfaceExecPrepaid(_dappInterface, _claimTypes);
    }

    // Governance function to update the execution gasCost an interface needs to supply for its claims
    function updateInterfaceExecGas(address _dappInterface,
                                    uint256[] _claimTypes,
                                    uint256[] _executionGas
    )
        onlyOwner
        public
    {

        for (uint256 i = 0; i < _claimTypes.length; i++) {
            // Set each of the requested claim types execution prepayment
            execPrepaidByInterfaceClaim[_dappInterface][_claimTypes[i]] = _executionGas[i];
        }

        emit LogUpdatedInterfaceExecGas(_dappInterface);
    }
    // **************************** Core Updateability END ******************************

    // **************************** Claims Updateability ***************************
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
                             _claimOwner,
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
                             ownerOf(_claimId),
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
                            ownerOf(_claimId),
                            claimId
        );
    }
    // **************************** burnClaim() END ***************************



    // **************************** payExecutor() ***************************
    function payExecutor(address payable _executor, uint256 _claimId)
        onlyWhiteListedInterface(msg.sender)  // msg.sender == dappInterface
        external
        returns(bool)
    {
        Claim memory claim = claims[_claimId];

        // Checks: only dappInterface to said claim can call this functiom
        require(claim.dappInterface == msg.sender,
            "payExecutor: msg.sender must be the dappInterface to the executed Claim"
        );

        // Effects: Burn the executed claim
        burnClaim(_claimId);

        uint256 executorGasRefund = claim.executionGas.mul(gasPrice);
        uint256 executorReward = executorGasRefund.add(executorProfit).sub(executorRewardPoolContribution);
        // Interactions: transfer ether reward to executor
        _executor.transfer(executorReward);

        // gelatoDrip signals whether core protocol incurred a loss from the payout
        bool gelatoDrip = executorReward > claim.executionPrepaid;
        // Event emission
        emit LogExecutorPayout(msg.sender,
                               _executor,
                               gelatoDrip,
                               executorReward,
                               claim.parentOrderHash
        );

        // Possibly delete struct:


        return true;
    }
    // **************************** payExecutor() END ***************************

}


