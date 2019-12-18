pragma solidity 0.6.0;

import "../../triggers/IGelatoTrigger.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCoreAccounting - solidity interface of GelatoCoreAccounting
/// @notice APIs for GelatoCore Owners and Executors
/// @dev all the APIs and events are implemented inside GelatoCoreAccounting
interface IGelatoCoreAccounting {

    event LogRegisterExecutor(
        address payable indexed executor,
        uint256 executorPrice,
        uint256 executorClaimLifespan
    );

    event LogDeregisterExecutor(address payable indexed executor);

    event LogSetExecutorPrice(uint256 executorPrice, uint256 newExecutorPrice);

    event LogSetExecutorClaimLifespan(
        uint256 executorClaimLifespan,
        uint256 newExecutorClaimLifespan
    );

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    event LogSetMinExecutionClaimLifespan(
        uint256 minExecutionClaimLifespan,
        uint256 newMinExecutionClaimLifespan
    );

    event LogSetGelatoCoreExecGasOverhead(
        uint256 gelatoCoreExecGasOverhead,
        uint256 _newGasOverhead
    );

    event LogSetUserProxyExecGasOverhead(
        uint256 userProxyExecGasOverhead,
        uint256 _newGasOverhead
    );

    /**
     * @dev fn to register as an executorClaimLifespan
     * @param _executorPrice the price factor the executor charges for its services
     * @param _executorClaimLifespan the lifespan of claims minted for this executor
     * @notice while executorPrice could be 0, executorClaimLifespan must be at least
       what the core protocol defines as the minimum (e.g. 10 minutes).
     * @notice NEW
     */
    function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external;

    /**
     * @dev fn to deregister as an executor
     * @notice ideally this fn is called by all executors as soon as they stop
       running their node/business. However, this behavior cannot be enforced.
       Frontends/Minters have to monitor executors' uptime themselves, in order to
       determine which listed executors are alive and have strong service guarantees.
     */
    function deregisterExecutor() external;

    /**
     * @dev fn for executors to configure their pricing of claims minted for them
     * @param _newExecutorGasPrice the new price to be listed for the executor
     * @notice param can be 0 for executors that operate pro bono - caution:
        if executors set their price to 0 then they get nothing, not even gas refunds.
     */
    function setExecutorPrice(uint256 _newExecutorGasPrice) external;

    /**
     * @dev fn for executors to configure the lifespan of claims minted for them
     * @param _newExecutorClaimLifespan the new lifespan to be listed for the executor
     * @notice param cannot be 0 - use deregisterExecutor() to deregister
     */
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;

    /**
     * @dev function for executors to withdraw their ETH on core
     * @notice funds withdrawal => re-entrancy protection.
     * @notice new: we use .sendValue instead of .transfer due to IstanbulHF
     */
    function withdrawExecutorBalance() external;

    /// @dev get the gelato-wide minimum executionClaim lifespan
    /// @return the minimum executionClaim lifespan for all executors
    function minExecutionClaimLifespan() external view returns(uint256);

    /// @dev get an executor's price
    /// @param _executor TO DO
    /// @return uint256 executor's price factor
    function executorPrice(address _executor) external view returns(uint256);

    /// @dev get an executor's executionClaim lifespan
    /// @param _executor TO DO
    /// @return uint256 executor's executionClaim lifespan
    function executorClaimLifespan(address _executor) external view returns(uint256);

    /// @dev get the gelato-internal wei balance of an executor
    /// @param _executor z
    /// @return uint256 wei amount of _executor's gelato-internal deposit
    function executorBalance(address _executor) external view returns(uint256);

    /// @dev getter for gelatoCoreExecGasOverhead state variable
    /// @return uint256 gelatoCoreExecGasOverhead
    function gelatoCoreExecGasOverhead() external pure returns(uint256);

    /// @dev getter for userProxyExecGasOverhead state variable
    /// @return uint256 userProxyExecGasOverhead
    function userProxyExecGasOverhead() external pure returns(uint256);

    /// @dev getter for internalExecutionGas state variable
    /// @return uint256 internalExecutionGas
    function totalExecutionGasOverhead() external pure returns(uint256);

    /**
     * @dev get the deposit payable for minting on gelatoCore
     * @param _action the action contract to be executed
     * @param _selectedExecutor the executor that should call the action
     * @return mintingDepositPayable wei amount to deposit on GelatoCore for minting
     * @notice minters (e.g. frontends) should use this API to get the msg.value
       payable to GelatoCore's mintExecutionClaim function.
     */
    function getMintingDepositPayable(
        address _selectedExecutor,
        IGelatoTrigger _trigger,
        IGelatoAction _action
    )
        external
        view
        returns(uint256 mintingDepositPayable);

    /// @dev calculates gas requirements based off _actionGasTotal
    /// @param _triggerGas the gas forwared to trigger.staticcall inside gelatoCore.execute
    /// @param _actionGasTotal the gas forwarded with the action call
    /// @return the minimum gas required for calls to gelatoCore.execute()
    function getMinExecutionGas(uint256 _triggerGas, uint256 _actionGasTotal)
        external
        pure
        returns(uint256);
}