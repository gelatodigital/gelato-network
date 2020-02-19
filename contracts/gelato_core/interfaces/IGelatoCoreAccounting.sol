pragma solidity ^0.6.2;

import "../../conditions/IGelatoCondition.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCoreAccounting - solidity interface of GelatoCoreAccounting
/// @notice APIs for GelatoCore Owners and Executors
/// @dev all the APIs and events are implemented inside GelatoCoreAccounting
interface IGelatoCoreAccounting {

    event LogSetAdminGasPrice(uint256 oldGasPrice, uint256 newGasPrice, address admin);

    event LogAddSponsorBalance(
        address indexed sponsor,
        uint256 previousSponsorBalance,
        uint256 newSponsorBalance
    );

    event LogWithdrawSponsorBalance(
        address indexed sponsor,
        uint256 previousSponsorBalance,
        uint256 newSponsorBalance
    );

    event LogRegisterExecutor(
        address payable indexed executor,
        uint256 executorClaimLifespan
    );

    event LogDeregisterExecutor(address payable indexed executor);

    event LogSetExecutorClaimLifespan(
        uint256 executorClaimLifespan,
        uint256 newExecutorClaimLifespan
    );

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    /// @dev onlyOwner can call
    function setAdminGasPrice(uint256 _newGasPrice) external;

    // Sponsor Economics
    function sponsorCondition(address _sponsor, IGelatoCondition _condition) external;
    function sponsorAction(address _sponsor, IGelatoAction _action) external;
    function addSponsorBalance(uint256 _amount) external;
    function withdrawSponsorBalance(uint256 _withdrawAmount) external;

    /**
     * @dev fn to register as an executorClaimLifespan
     * @param _executorClaimLifespan the lifespan of claims minted for this executor
     * @notice while executorPrice could be 0, executorClaimLifespan must be at least
       what the core protocol defines as the minimum (e.g. 10 minutes).
     * @notice NEW
     */
    function registerExecutor(uint256 _executorClaimLifespan) external;

    /**
     * @dev fn to deregister as an executor
     * @notice ideally this fn is called by all executors as soon as they stop
       running their node/business. However, this behavior cannot be enforced.
       Frontends/Minters have to monitor executors' uptime themselves, in order to
       determine which listed executors are alive and have strong service guarantees.
     */
    function deregisterExecutor() external;

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
    function withdrawExecutorBalance(uint256 _withdrawAmount) external;

    /// @dev returns the protocol enforced executor gas price
    /// @return uint256 executor's price factor
    function adminGasPrice() external view returns(uint256);

    function isConditionSponsored(address _sponsor, IGelatoCondition _condition)
        external
        view
        returns(bool);
    function isActionSponsored(address _sponsor, IGelatoAction _action)
        external
        view
        returns(bool);
    function sponsorBalance(address _sponsor) external view returns(uint256);

    /// @dev get the gelato-internal wei balance of an executor
    /// @param _executor z
    /// @return uint256 wei amount of _executor's gelato-internal deposit
    function executorBalance(address _executor) external view returns(uint256);

    /// @dev get an executor's executionClaim lifespan
    /// @param _executor TO DO
    /// @return uint256 executor's executionClaim lifespan
    function executorClaimLifespan(address _executor) external view returns(uint256);
}