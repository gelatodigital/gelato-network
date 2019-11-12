pragma solidity ^0.5.10;

import './GelatoUserProxy.sol';
import './interfaces/triggers_actions_interfaces/IGelatoAction.sol';
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '@openzeppelin/contracts-ethereum-package/contracts/drafts/Counters.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol';


/// @title GelatoUserProxyManager
/// @dev registry and factory for GelatoUserProxies
contract GelatoUserProxyManager
{
    /// @dev non-deploy base contract
    constructor() internal {}

    uint256 internal userCount;
    mapping(address => address) internal userToProxy;
    mapping(address => address payable) internal proxyToUser;
    address payable[] internal users;
    address[] internal userProxies;

    modifier userHasNoProxy {
        require(userToProxy[msg.sender] == address(0),
            "GelatoUserProxyManager: user already has an proxy"
        );
        _;
    }

    /// @notice deploys gelato proxy for users that have no proxy yet
    /// @dev This function should be called for users that have nothing deployed yet
    /// @return address of the deployed GelatoUserProxy
    function createUserProxy()
        external
        userHasNoProxy
        returns(address userProxy)
    {
        userProxy = address(new GelatoUserProxy(msg.sender));
        userToProxy[msg.sender] = userProxy;
        proxyToUser[userProxy] = msg.sender;
        users.push(msg.sender);
        userProxies.push(userProxy);
        userCount++;
        emit LogCreateUserProxy(userProxy, msg.sender);
    }
    event LogCreateUserProxy(address indexed userProxy, address indexed user);

    // ______________ State Readers ______________________________________
    function _isUser(address _user)
        internal
        view
        returns(bool)
    {
        return userToProxy[_user] != address(0);
    }

    function _isUserProxy(address _userProxy)
        internal
        view
        returns(bool)
    {
        return proxyToUser[_userProxy] != address(0);
    }
    // ______ State Read APIs __________________
    function getUserCount() external view returns(uint256) {return userCount;}

    function getUserOfProxy(address _proxy)
        external
        view
        returns(address payable)
    {
        return proxyToUser[_proxy];
    }

    function isUser(address _user)
        external
        view
        returns(bool)
    {
        return _isUser(_user);
    }

    function getProxyOfUser(address _user)
        external
        view
        returns(address)
    {
        return userToProxy[_user];
    }

    function isUserProxy(address _userProxy)
        external
        view
        returns(bool)
    {
        return _isUserProxy(_userProxy);
    }

    function getUsers()
        external
        view
        returns(address payable[] memory)
    {
        return users;
    }

    function getUserProxies()
        external
        view
        returns(address[] memory)
    {
        return userProxies;
    }
    // =========================
}



/**
 * @title GelatoCoreAccounting
 * @notice non-deploy base contract
 */
contract GelatoCoreAccounting is Initializable,
                                 Ownable,
                                 ReentrancyGuard
{
    /// @dev non-deploy base contract
    constructor() internal {}

    using Address for address payable;  /// for oz's sendValue method
    using SafeMath for uint256;

    /// @notice NEW: the minimum executionClaimLifespan imposed upon executors
    uint256 internal minExecutionClaimLifespan;
    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) internal executorPrice;
    mapping(address => uint256) internal executorClaimLifespan;
    mapping(address => uint256) internal executorBalance;
    //_____________ Gas values for executionClaim cost calculations _______
    uint256 internal gasOutsideGasleftChecks;
    uint256 internal gasInsideGasleftChecks;
    uint256 internal canExecMaxGas;
    uint256 internal userProxyExecGas;
    // =========================


    /**
     * @dev initializer function is like a constructor for upgradeable contracts
     * param _gasOutsideGasleftChecks: gas cost to be determined and set by owner
     * param _gasInsideGasleftChecks: gas cost to be determined and set by owner
     * param _canExecMaxGas: gas cost to be determined and set by owner
     * param _userProxyExecGas: the overhead consumed by the GelatoUserProxy execute fn
     * @notice as per OpenZeppelin SDK
     */
    function _initialize()
        internal
        initializer
    {
        Ownable.initialize(msg.sender);
        ReentrancyGuard.initialize();
        minExecutionClaimLifespan = 600;  // 10 minutes
        gasOutsideGasleftChecks = 40000 + 17331;
        gasInsideGasleftChecks = 100000 - gasOutsideGasleftChecks;
        canExecMaxGas = 100000;
        userProxyExecGas = 100000;
    }

    // _______ ExecutionClaim Gas Cost Calculation _________________________________
    /**
     * @dev calculates gas requirements based off _actionGasStipend
     * @param _actionGasStipend the gas forwarded with the action call
     * @return the minimum gas required for calls to gelatoCore.execute()
     */
    function _getMinExecutionGasRequirement(uint256 _actionGasStipend)
        internal
        view
        returns(uint256)
    {
        return (gasOutsideGasleftChecks
                + gasInsideGasleftChecks
                + canExecMaxGas
                + userProxyExecGas
                .add(_actionGasStipend)
        );
    }
    // =======

    // _______ APIs for executionClaim pricing ______________________________________
    /**
     * @dev get the minimum execution gas requirement for a particular action
     * @param _actionGasStipend x
     */
    function getMinExecutionGasRequirement(uint256 _actionGasStipend)
        external
        view
        returns(uint256)
    {
        return _getMinExecutionGasRequirement(_actionGasStipend);
    }

    /**
     * @dev get the deposit payable for minting on gelatoCore
     * @param _action the action contract to be executed
     * @param _selectedExecutor the executor that should call the action
     * @return amount of wei that needs to be deposited inside gelato for minting
     * @notice minters (e.g. frontends) should use this API to get the msg.value
       payable to GelatoCore's mintExecutionClaim function.
     */
    function getMintingDepositPayable(address _action,
                                      address _selectedExecutor
    )
        external
        view
        onlyRegisteredExecutors(_selectedExecutor)
        returns(uint256 mintingDepositPayable)
    {
        uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
        uint256 executionMinGas = _getMinExecutionGasRequirement(actionGasStipend);
        mintingDepositPayable = executionMinGas.mul(executorPrice[_selectedExecutor]);
    }
    // =======

    // __________ Interface for State Reads ___________________________________
    /**
     * @dev get the gelato-wide minimum executionClaim lifespan
     * @return the minimum executionClaim lifespan for all executors
     */
    function getMinExecutionClaimLifespan() external view returns(uint256) {
        return minExecutionClaimLifespan;
    }
    /**
     * @dev get an executor's price
     * @param _executor x
     * @return uint256 executor's price factor
     */
    function getExecutorPrice(address _executor) external view returns(uint256) {
        return executorPrice[_executor];
    }
    /**
     * @dev get an executor's executionClaim lifespan
     * @param _executor x
     * @return uint256 executor's executionClaim lifespan
     */
    function getExecutorClaimLifespan(address _executor) external view returns(uint256) {
        return executorClaimLifespan[_executor];
    }
    /**
     * @dev get the gelato-internal wei balance of an executor
     * @param _executor z
     * @return uint256 wei amount of _executor's gelato-internal deposit
     */
    function getExecutorBalance(address _executor) external view returns(uint256) {
        return executorBalance[_executor];
    }
    /**
     * @dev getter for gasOutsideGasleftChecks state variable
     * @return uint256 gasOutsideGasleftChecks
     */
    function getGasOutsideGasleftChecks() external view returns(uint256) {
        return gasOutsideGasleftChecks;
    }
    /**
     * @dev getter for gasInsideGasleftChecks state variable
     * @return uint256 gasInsideGasleftChecks
     */
    function getGasInsideGasleftChecks() external view returns(uint256) {
        return gasInsideGasleftChecks;
    }
    /**
     * @dev getter for canExecMaxGas state variable
     * @return uint256 canExecMaxGas
     */
    function getCanExecMaxGas() external view returns(uint256) {
        return canExecMaxGas;
    }
    /**
     * @dev getter for userProxyExecGas state variable
     * @return uint256 userProxyExecGas
     */
    function getUserProxyExecGas() external view returns(uint256) {
        return userProxyExecGas;
    }
    // =========================

    // ____________ Interface for STATE MUTATIONS ________________________________________
    //_____________ Interface for Executor _________________________________
    // __ Executor De/Registrations _______
    /**
     * @dev fn to register as an executorClaimLifespan
     * @param _executorPrice the price factor the executor charges for its services
     * @param _executorClaimLifespan the lifespan of claims minted for this executor
     * @notice while executorPrice could be 0, executorClaimLifespan must be at least
       what the core protocol defines as the minimum (e.g. 10 minutes).
     * @notice NEW
     */
    function registerExecutor(uint256 _executorPrice,
                              uint256 _executorClaimLifespan
    )
        external
    {
        require(_executorClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.registerExecutor: _executorClaimLifespan cannot be 0"
        );
        executorPrice[msg.sender] = _executorPrice;
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        emit LogRegisterExecutor(msg.sender,
                                 _executorPrice,
                                 _executorClaimLifespan
        );
    }
    event LogRegisterExecutor(address payable indexed executor,
                              uint256 executorPrice,
                              uint256 executorClaimLifespan
    );
    /**
     * @dev throws if the passed address is not a registered executor
     * @param _executor: the address to be checked against executor registrations
     */
    modifier onlyRegisteredExecutors(address _executor) {
        require(executorClaimLifespan[_executor] != 0,
            "GelatoCoreAccounting.onlyRegisteredExecutors: failed"
        );
        _;
    }
    /**
     * @dev fn to deregister as an executor
     * @notice ideally this fn is called by all executors as soon as they stop
       running their node/business. However, this behavior cannot be enforced.
       Frontends/Minters have to monitor executors' uptime themselves, in order to
       determine which listed executors are alive and have strong service guarantees.
     */
    function deregisterExecutor()
        external
        onlyRegisteredExecutors(msg.sender)
    {
        executorPrice[msg.sender] = 0;
        executorClaimLifespan[msg.sender] = 0;
        emit LogDeregisterExecutor(msg.sender);
    }
    event LogDeregisterExecutor(address payable indexed executor);
    // ===

    /**
     * @dev fn for executors to configure their pricing of claims minted for them
     * @param _newExecutorGasPrice the new price to be listed for the executor
     * @notice param can be 0 for executors that operate pro bono - caution:
        if executors set their price to 0 then they get nothing, not even gas refunds.
     */
    function setExecutorPrice(uint256 _newExecutorGasPrice)
        external
    {
        emit LogSetExecutorPrice(executorPrice[msg.sender], _newExecutorGasPrice);
        executorPrice[msg.sender] = _newExecutorGasPrice;
    }
    event LogSetExecutorPrice(uint256 executorPrice,
                              uint256 newExecutorPrice
    );

    /**
     * @dev fn for executors to configure the lifespan of claims minted for them
     * @param _newExecutorClaimLifespan the new lifespan to be listed for the executor
     * @notice param cannot be 0 - use deregisterExecutor() to deregister
     */
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external
    {
        require(_newExecutorClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.setExecutorClaimLifespan: failed"
        );
        emit LogSetExecutorClaimLifespan(executorClaimLifespan[msg.sender],
                                         _newExecutorClaimLifespan
        );
        executorClaimLifespan[msg.sender] = _newExecutorClaimLifespan;
    }
    event LogSetExecutorClaimLifespan(uint256 executorClaimLifespan,
                                      uint256 newExecutorClaimLifespan
    );

    /**
     * @dev function for executors to withdraw their ETH on core
     * @notice funds withdrawal => re-entrancy protection.
     * @notice new: we use .sendValue instead of .transfer due to IstanbulHF
     */
    function withdrawExecutorBalance()
        external
        nonReentrant
    {
        // Checks
        uint256 currentExecutorBalance = executorBalance[msg.sender];
        require(currentExecutorBalance > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: failed"
        );
        // Effects
        executorBalance[msg.sender] = 0;
        // Interaction
         ///@notice NEW: .call syntax due to Istanbul opcodes and .transfer problem
        msg.sender.sendValue(currentExecutorBalance);
        emit LogWithdrawExecutorBalance(msg.sender, currentExecutorBalance);
    }
    event LogWithdrawExecutorBalance(address indexed executor,
                                     uint256 withdrawAmount
    );
    // =========

    //_____________ Interface for GelatoCore Owner ________________________________
    /**
     * @dev setter for gelatoCore devs to impose a lower boundary on
       executors' listed claim lifespans, to disallow bad claims
     * @param _newMinExecutionClaimLifespan x
     */
    function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan)
        onlyOwner
        external
    {
        emit LogSetMinExecutionClaimLifespan(minExecutionClaimLifespan,
                                             _newMinExecutionClaimLifespan
        );
        minExecutionClaimLifespan = _newMinExecutionClaimLifespan;
    }
    event LogSetMinExecutionClaimLifespan(uint256 minExecutionClaimLifespan,
                                          uint256 newMinExecutionClaimLifespan
    );

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newGasOutsideGasleftChecks x
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogSetGasOutsideGasleftChecks(gasOutsideGasleftChecks,
                                           _newGasOutsideGasleftChecks
        );
        gasOutsideGasleftChecks = _newGasOutsideGasleftChecks;
    }
    event LogSetGasOutsideGasleftChecks(uint256 gasOutsideGasleftChecks,
                                        uint256 newGasOutsideGasleftChecks
    );

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newGasInsideGasleftChecks z
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogSetGasInsideGasleftChecks(gasInsideGasleftChecks,
                                          _newGasInsideGasleftChecks
        );
        gasInsideGasleftChecks = _newGasInsideGasleftChecks;
    }
    event LogSetGasInsideGasleftChecks(uint256 gasInsideGasleftChecks,
                                       uint256 newGasInsideGasleftChecks
    );

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newCanExecMaxGas z
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setCanExecMaxGas(uint256 _newCanExecMaxGas)
        onlyOwner
        external
    {
        emit LogSetCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }
    event LogSetCanExecMaxGas(uint256 canExecMaxGas, uint256 newCanExecMaxGas);

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newUserProxyExecGas z
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setUserProxyExecGas(uint256 _newUserProxyExecGas)
        onlyOwner
        external
    {
        emit LogSetUserProxyExecGas(userProxyExecGas, _newUserProxyExecGas);
        userProxyExecGas = _newUserProxyExecGas;
    }
    event LogSetUserProxyExecGas(uint256 userProxyExecGas, uint256 newUserProxyExecGas);
    // =========
    // =========================
}



/**
 * @title GelatoCore
 * @notice deployable contract
 */
contract GelatoCore is GelatoUserProxyManager,
                       GelatoCoreAccounting
{
    using Address for address payable;  /// for oz's sendValue method

    /// @dev initializer fn must call the initializers of all the base contracts.
    /// @notice GelatoCore's initializer function (constructor for upgradeable contracts)
    function initialize()
        public
        initializer
    {
        GelatoCoreAccounting._initialize();
    }

    // Unique ExecutionClaim Ids
    using Counters for Counters.Counter;
    Counters.Counter private executionClaimIds;
    /**
     * @dev get the current executionClaimId
     * @return uint256 current executionClaim Id
     */
    function getCurrentExecutionClaimId()
        external
        view
        returns(uint256 currentId)
    {
        currentId = executionClaimIds.current();
    }

    // executionClaimId => userProxyByExecutionClaimId
    mapping(uint256 => address) private userProxyByExecutionClaimId;
    /**
     * @dev api to read from the userProxyByExecutionClaimId state variable
     * @param _executionClaimId z
     * @return address of the userProxy behind _executionClaimId
     */
    function getUserProxyWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address)
    {
        return userProxyByExecutionClaimId[_executionClaimId];
    }

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address payable)
    {
        address userProxy = userProxyByExecutionClaimId[_executionClaimId];
        return proxyToUser[userProxy];
    }

    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) private hashedExecutionClaims;
    /**
     * @dev interface to read from the hashedExecutionClaims state variable
     * @param _executionClaimId z
     * @return the bytes32 hash of the executionClaim with _executionClaimId
     */
    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        view
        returns(bytes32)
    {
        return hashedExecutionClaims[_executionClaimId];
    }

    // $$$$$$$$$$$ mintExecutionClaim() API  $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    event LogNewExecutionClaimMinted(address indexed selectedExecutor,
                                     uint256 indexed executionClaimId,
                                     address indexed userProxy,
                                     bytes actionPayload,
                                     uint256 executeGas,
                                     uint256 executionClaimExpiryDate,
                                     uint256 mintingDeposit
    );
    event LogTriggerActionMinted(uint256 indexed executionClaimId,
                                 address indexed trigger,
                                 bytes triggerPayload,
                                 address indexed action
    );
    /**
     * @dev API for minting execution claims on gelatoCore
     * @param _trigger: the address of the trigger
     * @param _triggerPayload: the encoded trigger params with function selector
     * @param _action: the address of the action
     * @param _actionPayload: the encoded action params with function selector
     * @param _selectedExecutor: the registered executor to service this claim
     * @notice re-entrancy guard because accounting ops are present inside fn
     * @notice msg.value is a refundable deposit - only a fee if executed
     * @notice minting event split into two, due to stack too deep issue
     */
    function mintExecutionClaim(address _trigger,
                                bytes calldata _triggerPayload,
                                address _action,
                                bytes calldata _actionPayload,
                                address payable _selectedExecutor

    )
        external
        payable
        onlyRegisteredExecutors(_selectedExecutor)
        nonReentrant
    {
        // ______ Authenticate msg.sender is proxied user or a proxy _______
        address userProxy;
        if (_isUser(msg.sender)) userProxy = userToProxy[msg.sender];
        else if (_isUserProxy(msg.sender)) userProxy = msg.sender;
        else revert("GelatoCore.mintExecutionClaim: msg.sender is not proxied");
        // =============
        // ______ Charge Minting Deposit _______________________________________
        uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
        {
            uint256 executionMinGas = _getMinExecutionGasRequirement(actionGasStipend);
            uint256 mintingDepositPayable
                = executionMinGas.mul(executorPrice[_selectedExecutor]);
            require(msg.value == mintingDepositPayable,
                "GelatoCore.mintExecutionClaim: msg.value failed"
            );
        }
        // =============
        // ______ Mint new executionClaim ______________________________________
        Counters.increment(executionClaimIds);
        uint256 executionClaimId = executionClaimIds.current();
        userProxyByExecutionClaimId[executionClaimId] = userProxy;
        // =============
        // ______ ExecutionClaim Hashing ______________________________________
        uint256 executionClaimExpiryDate
            = now.add(executorClaimLifespan[_selectedExecutor]);
        {
            /// @notice Include executionClaimId to avoid hash collisions
            bytes32 executionClaimHash
                = keccak256(abi.encodePacked(_trigger,
                                             _triggerPayload,
                                             userProxy,
                                             _actionPayload,
                                             executionClaimId,
                                             _selectedExecutor,
                                             userProxyExecGas.add(actionGasStipend),
                                             executionClaimExpiryDate,
                                             msg.value
            ));
            hashedExecutionClaims[executionClaimId] = executionClaimHash;
        }
        // =============
        emit LogNewExecutionClaimMinted(_selectedExecutor,
                                        executionClaimId,
                                        userProxy,
                                        _actionPayload,
                                        userProxyExecGas.add(actionGasStipend),
                                        executionClaimExpiryDate,
                                        msg.value
        );
        emit LogTriggerActionMinted(executionClaimId, _trigger, _triggerPayload, _action);
    }
    // $$$$$$$$$$$$$$$ mintExecutionClaim() API END


    // ********************* EXECUTE FUNCTION SUITE *********************
    //  checked by canExecute and returned as a uint256 from User
    enum CanExecuteCheck {
        WrongCalldataOrAlreadyDeleted,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerReverted,
        NotExecutable,
        Executable
    }

    /// @dev canExecute API forwards its calls to this private function
    function _canExecute(address _trigger,
                         bytes memory _triggerPayload,
                         address _userProxy,
                         bytes memory _actionPayload,
                         uint256 _executeGas,
                         uint256 _executionClaimId,
                         uint256 _executionClaimExpiryDate,
                         uint256 _mintingDeposit
    )
        private
        view
        returns (uint8)
    {
        // _____________ Static CHECKS __________________________________________
        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_trigger,
                                         _triggerPayload,
                                         _userProxy,
                                         _actionPayload,
                                         _executionClaimId,
                                         msg.sender,  // selected? executor
                                         _executeGas,
                                         _executionClaimExpiryDate,
                                         _mintingDeposit
        ));
        // Check passed calldata and that msg.sender is selected executor
        if(computedExecutionClaimHash != hashedExecutionClaims[_executionClaimId]) {
            return uint8(CanExecuteCheck.WrongCalldataOrAlreadyDeleted);
        }
        // Require execution claim to exist / not be cancelled
        if (userProxyByExecutionClaimId[_executionClaimId] == address(0)) {
            return uint8(CanExecuteCheck.NonExistantExecutionClaim);
        }
        if (_executionClaimExpiryDate < now) {
            return uint8(CanExecuteCheck.ExecutionClaimExpired);
        }
        // =========
        // _____________ Dynamic CHECKS __________________________________________
        // Call to trigger view function (returns(bool))
        (bool success,
         bytes memory returndata) = (_trigger.staticcall
                                             .gas(canExecMaxGas) /// @notice removed hardcoded value
                                             (_triggerPayload)
        );
        if (!success) {
            return uint8(CanExecuteCheck.TriggerReverted);
        } else {
            bool executable = abi.decode(returndata, (bool));
            if (executable) {
                return uint8(CanExecuteCheck.Executable);
            } else {
                return uint8(CanExecuteCheck.NotExecutable);
            }
        }
        // ==============
    }
    /**
     * @dev the API for executors to check whether a claim is executable
     * @param _trigger executors get this from LogTriggerActionMinted
     * @param _triggerPayload executors get this from LogTriggerActionMinted
     * @param _userProxy executors get this from LogExecutionClaimMinted
     * @param _actionPayload executors get this from LogExecutionClaimMinted
     * @param _executeGas executors get this from LogExecutionClaimMinted
     * @param _executionClaimId executors get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate executors get this from LogExecutionClaimMinted
     * @param _mintingDeposit executors get this from LogExecutionClaimMinted
     * @return uint8 which converts to one of enum CanExecuteCheck values
     * @notice if return value == 6, the claim is executable
     */
    function canExecute(address _trigger,
                        bytes calldata _triggerPayload,
                        address _userProxy,
                        bytes calldata _actionPayload,
                        uint256 _executeGas,
                        uint256 _executionClaimId,
                        uint256 _executionClaimExpiryDate,
                        uint256 _mintingDeposit
    )
        external
        view
        returns (uint8)
    {
        return _canExecute(_trigger,
                           _triggerPayload,
                           _userProxy,
                           _actionPayload,
                           _executeGas,
                           _executionClaimId,
                           _executionClaimExpiryDate,
                           _mintingDeposit
        );
    }

    // ********************* EXECUTE FUNCTION SUITE *************************
    event LogCanExecuteFailed(uint256 indexed executionClaimId,
                              address payable indexed executor,
                              uint256 indexed canExecuteResult
    );
    event LogExecutionResult(uint256 indexed executionClaimId,
                             uint8 indexed executionResult,
                             address payable indexed executor
    );
    event LogClaimExecutedAndDeleted(uint256 indexed executionClaimId,
                                     address indexed userProxy,
                                     address payable indexed executor,
                                     uint256 gasUsedEstimate,
                                     uint256 gasPriceUsed,
                                     uint256 executionCostEstimate,
                                     uint256 executorPayout
    );

    enum ExecutionResult {
        Success,
        Failure,
        CanExecuteFailed
    }

    /**
     * @dev the API executors call when they execute an executionClaim
     * @param _trigger executors get this from LogTriggerActionMinted
     * @param _triggerPayload executors get this from LogTriggerActionMinted
     * @param _userProxy executors get this from LogExecutionClaimMinted
     * @param _actionPayload executors get this from LogExecutionClaimMinted
     * @param _action executors get this from LogTriggerActionMinted
     * @param _executeGas executors get this from LogExecutionClaimMinted
     * @param _executionClaimId executors get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate executors get this from LogExecutionClaimMinted
     * @param _mintingDeposit executors get this from LogExecutionClaimMinted
     * @return uint8 which converts to one of enum ExecutionResult values
     * @notice if return value == 0, the claim got executed
     * @notice re-entrancy protection due to accounting operations and interactions
     */
    function execute(address _trigger,
                     bytes calldata _triggerPayload,
                     address payable _userProxy,
                     bytes calldata _actionPayload,
                     address _action,
                     uint256 _executeGas,
                     uint256 _executionClaimId,
                     uint256 _executionClaimExpiryDate,
                     uint256 _mintingDeposit

    )
        external
        nonReentrant
        returns(uint8 executionResult)
    {
        // Ensure that executor sends enough gas for the execution
        uint256 startGas = gasleft();
        require(startGas >= _getMinExecutionGasRequirement(_executeGas),
            "GelatoCore.execute: Insufficient gas sent"
        );
        // _______ canExecute() check ______________________________________________
        {
            uint8 canExecuteResult = _canExecute(_trigger,
                                                 _triggerPayload,
                                                 _userProxy,
                                                 _actionPayload,
                                                 _executeGas,
                                                 _executionClaimId,
                                                 _executionClaimExpiryDate,
                                                 _mintingDeposit
            );
            if (canExecuteResult != uint8(CanExecuteCheck.Executable)) {
                emit LogCanExecuteFailed(_executionClaimId,
                                         msg.sender,
                                         canExecuteResult
                );
                return uint8(ExecutionResult.CanExecuteFailed);
            }
        }
        // ========
        // _________________________________________________________________________
        /// @notice We are past the canExecute latency problem between executors
        ///  initial call to canExecute, and the internal call to canExecute we
        ///  performed above inside the execute fn. This means that there should
        ///  be no more reverts UNLESS 1) trigger and/or action are buggy,
        ///  2) user has insufficient funds at disposal at execution time (e.g.
        ///   has approved funds, but in the interim has transferred them elsewhere)

        // **** EFFECTS (checks - effects - interactions) ****
        delete hashedExecutionClaims[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];

        // _________  call to userProxy.execute => action  __________________________
        {
            (bool success,) = (GelatoUserProxy(_userProxy).execute
                                                          .gas(_executeGas)
                                                          (_action, _actionPayload)
            );
            if (success) executionResult = uint8(ExecutionResult.Success);
            // @dev if execution fails, no revert, because executor still paid out
            else executionResult = uint8(ExecutionResult.Failure);
            emit LogExecutionResult(_executionClaimId, executionResult, msg.sender);
        }
        // ========
        {
            uint256 endGas = gasleft();
            // Calaculate how much gas we used up in this function.
            // executorGasRefundEstimate: factor in gas refunded via `delete` ops
            // @DEV UPDATE WITH NEW FUNC
            uint256 gasUsedEstimate = (startGas.sub(endGas)
                                               .add(gasOutsideGasleftChecks)
            );
            uint256 executionCostEstimate = gasUsedEstimate.mul(tx.gasprice);
            emit LogClaimExecutedAndDeleted(_executionClaimId,
                                            _userProxy,
                                            msg.sender,  // executor
                                            gasUsedEstimate,
                                            tx.gasprice,
                                            executionCostEstimate,
                                            _mintingDeposit
            );
        }
        // Balance Updates (INTERACTIONS)
        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
        // ====
    }
    // ************** execute() END
    // ********************* EXECUTE FUNCTION SUITE END


    // ********************* cancelExecutionClaim() *********************
    /**
     * @dev API for canceling executionClaims
     * @param _trigger callers get this from LogTriggerActionMinted
     * @param _triggerPayload callers get this from LogTriggerActionMinted
     * @param _userProxy callers get this from LogExecutionClaimMinted
     * @param _actionPayload callers get this from LogExecutionClaimMinted
     * @param _executionClaimId callers get this from LogExecutionClaimMinted
     * @param _selectedExecutor callers get this from LogExecutionClaimMinted
     * @param _executeGas callers get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate callers get this from LogExecutionClaimMinted
     * @param _mintingDeposit callers get this from LogExecutionClaimMinted
     * @notice re-entrancy protection due to accounting operations and interactions
     * @notice prior to executionClaim expiry, only owner of _userProxy can cancel
        for a refund. Post executionClaim expiry, _selectedExecutor can also cancel,
        for a reward.
     * @notice .sendValue instead of .transfer due to IstanbulHF
     */
    function cancelExecutionClaim(address _trigger,
                                  bytes calldata _triggerPayload,
                                  address payable _userProxy,
                                  bytes calldata _actionPayload,
                                  uint256 _executionClaimId,
                                  address payable _selectedExecutor,
                                  uint256 _executeGas,
                                  uint256 _executionClaimExpiryDate,
                                  uint256 _mintingDeposit
    )
        external
        nonReentrant
    {
        {
            if (msg.sender != proxyToUser[_userProxy]) {
                require(_executionClaimExpiryDate <= now && msg.sender == _selectedExecutor,
                    "GelatoCore.cancelExecutionClaim: only selected executor post expiry"
                );
            }
        }
        {
            bytes32 computedExecutionClaimHash
                = keccak256(abi.encodePacked(_trigger,
                                             _triggerPayload,
                                             _userProxy,
                                             _actionPayload,
                                             _executionClaimId,
                                             _selectedExecutor,  // selected? executor
                                             _executeGas,
                                             _executionClaimExpiryDate,
                                             _mintingDeposit
            ));
            require(computedExecutionClaimHash == hashedExecutionClaims[_executionClaimId],
                "GelatoCore.cancelExecutionClaim: hash compare failed"
            );
        }
        delete userProxyByExecutionClaimId[_executionClaimId];
        delete hashedExecutionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(_executionClaimId, _userProxy, msg.sender);
        msg.sender.sendValue(_mintingDeposit);  /// @notice NEW due to IstanbulHF
    }
    event LogExecutionClaimCancelled(uint256 indexed executionClaimId,
                                     address indexed userProxy,
                                     address indexed cancelor
    );
    // ********************* cancelExecutionClaim() END
}