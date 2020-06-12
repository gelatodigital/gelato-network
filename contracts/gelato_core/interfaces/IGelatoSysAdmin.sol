// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IGelatoSysAdmin {
    struct GelatoSysAdminInitialState {
        address gelatoGasPriceOracle;
        bytes oracleRequestData;
        uint256 gelatoMaxGas;
        uint256 internalGasRequirement;
        uint256 minExecutorStake;
        uint256 executorSuccessShare;
        uint256 sysAdminSuccessShare;
        uint256 totalSuccessShare;
    }

    // Events
    event LogGelatoGasPriceOracleSet(address indexed oldOracle, address indexed newOracle);
    event LogOracleRequestDataSet(bytes oldData, bytes newData);

    event LogGelatoMaxGasSet(uint256 oldMaxGas, uint256 newMaxGas);
    event LogInternalGasRequirementSet(uint256 oldRequirment, uint256 newRequirment);

    event LogMinExecutorStakeSet(uint256 oldMin, uint256 newMin);

    event LogExecutorSuccessShareSet(uint256 oldShare, uint256 newShare, uint256 total);
    event LogSysAdminSuccessShareSet(uint256 oldShare, uint256 newShare, uint256 total);

    event LogSysAdminFundsWithdrawn(uint256 oldBalance, uint256 newBalance);

    // State Writing

    /// @notice Assign new gas price oracle
    /// @dev Only callable by sysAdmin
    /// @param _newOracle Address of new oracle
    function setGelatoGasPriceOracle(address _newOracle) external;

    /// @notice Assign new gas price oracle
    /// @dev Only callable by sysAdmin
    /// @param _requestData The encoded payload for the staticcall to the oracle.
    function setOracleRequestData(bytes calldata _requestData) external;

    /// @notice Assign new maximum gas limit providers can consume in executionWrapper()
    /// @dev Only callable by sysAdmin
    /// @param _newMaxGas New maximum gas limit
    function setGelatoMaxGas(uint256 _newMaxGas) external;

    /// @notice Assign new interal gas limit requirement for exec()
    /// @dev Only callable by sysAdmin
    /// @param _newRequirement New internal gas requirement
    function setInternalGasRequirement(uint256 _newRequirement) external;

    /// @notice Assign new minimum executor stake
    /// @dev Only callable by sysAdmin
    /// @param _newMin New minimum executor stake
    function setMinExecutorStake(uint256 _newMin) external;

    /// @notice Assign new success share for executors to receive after successful execution
    /// @dev Only callable by sysAdmin
    /// @param _percentage New % success share of total gas consumed
    function setExecutorSuccessShare(uint256 _percentage) external;

    /// @notice Assign new success share for sysAdmin to receive after successful execution
    /// @dev Only callable by sysAdmin
    /// @param _percentage New % success share of total gas consumed
    function setSysAdminSuccessShare(uint256 _percentage) external;

    /// @notice Withdraw sysAdmin funds
    /// @dev Only callable by sysAdmin
    /// @param _amount Amount to withdraw
    /// @param _to Address to receive the funds
    function withdrawSysAdminFunds(uint256 _amount, address payable _to) external returns(uint256);

    // State Reading
    /// @notice Unaccounted tx overhead that will be refunded to executors
    function EXEC_TX_OVERHEAD() external pure returns(uint256);

    /// @notice Addess of current Gelato Gas Price Oracle
    function gelatoGasPriceOracle() external view returns(address);

    /// @notice Getter for oracleRequestData state variable
    function oracleRequestData() external view returns(bytes memory);

    /// @notice Gas limit an executor has to submit to get refunded even if actions revert
    function gelatoMaxGas() external view returns(uint256);

    /// @notice Internal gas limit requirements ti ensure executor payout
    function internalGasRequirement() external view returns(uint256);

    /// @notice Minimum stake required from executors
    function minExecutorStake() external view returns(uint256);

    /// @notice % Fee executors get as a reward for a successful execution
    function executorSuccessShare() external view returns(uint256);

    /// @notice Total % Fee executors and sysAdmin collectively get as a reward for a successful execution
    /// @dev Saves a state read
    function totalSuccessShare() external view returns(uint256);

    /// @notice Get total fee providers pay executors for a successful execution
    /// @param _gas Gas consumed by transaction
    /// @param _gasPrice Current gelato gas price
    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(uint256);

    /// @notice % Fee sysAdmin gets as a reward for a successful execution
    function sysAdminSuccessShare() external view returns(uint256);

    /// @notice Get total fee providers pay sysAdmin for a successful execution
    /// @param _gas Gas consumed by transaction
    /// @param _gasPrice Current gelato gas price
    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(uint256);

    /// @notice Get sysAdminds funds
    function sysAdminFunds() external view returns(uint256);
}
