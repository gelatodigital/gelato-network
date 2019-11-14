pragma solidity ^0.5.10;

import './interfaces/triggers_actions_interfaces/IGelatoAction.sol';
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol';

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