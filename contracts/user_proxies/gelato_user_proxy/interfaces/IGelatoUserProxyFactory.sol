pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoUserProxy } from "../GelatoUserProxy.sol";
import { Action, Provider, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxyFactory {
    event LogCreation(
        address indexed user,
        GelatoUserProxy indexed userProxy,
        uint256 funding
    );

    /// @notice Create a GelatoUserProxy.
    /// @dev Pass empty arrays for each parameter, if you only want to create.
    /// @param _actions Optional actions to execute.
    /// @param _providers Providers for each of the _tasks.
    /// @param _tasks Tasks to submit to Gelato. Must each have their own Provider.
    /// @param _expiryDates expiryDate for each of the _tasks.
    ///  CAUTION: The ordering of _providers<=>_tasks<=>_expiryDates must be coordinated.
    /// @return userProxy address of deployed proxy contract.
    function create(
        Action[] calldata _actions,
        Provider[] calldata _providers,
        Task[] calldata _tasks,
        uint256[] calldata _expiryDates
    )
        external
        payable
        returns(GelatoUserProxy userProxy);

    /// @notice Create a GelatoUserProxy using the create2 opcode.
    /// @dev This allows for creating  a GelatoUserProxy instance at a specific address.
    ///  which can be predicted and e.g. prefunded.
    /// @param _saltNonce salt is generated thusly: keccak256(abi.encode(_user, _saltNonce))
    /// @param _actions Optional actions to execute.
    /// @param _providers Providers for each of the _tasks.
    /// @param _tasks Tasks to submit to Gelato. Must each have their own Provider.
    /// @param _expiryDates expiryDate for each of the _tasks.
    ///  CAUTION: The ordering of _providers<=>_tasks<=>_expiryDates must be coordinated.
    function createTwo(
        uint256 _saltNonce,
        Provider[] calldata _providers,
        Action[] calldata _actions,
        Task[] calldata _tasks,
        uint256[] calldata _expiryDates
    )
        external
        payable
        returns(GelatoUserProxy userProxy);


    /// @notice Like create but for submitting a Task Cycle to Gelato. A
    //   Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed
    /// @notice A Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed.
    /// @param _actions Optional actions to execute.
    /// @param _provider Gelato Provider object for _tasks: provider address and module.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _cycles How many full cycles will be submitted
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    function createAndSubmitTaskCycle(
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _cycles,
        uint256 _expiryDate
    )
        external
        payable
        returns(GelatoUserProxy userProxy);


    /// @notice Just like createAndSubmitTaskCycle just using create2, thus allowing for
    ///  knowing the address the GelatoUserProxy will be assigned to in advance.
    /// @param _saltNonce salt is generated thusly: keccak256(abi.encode(_user, _saltNonce))
    function createTwoAndSubmitTaskCycle(
        uint256 _saltNonce,
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _cycles,
        uint256 _expiryDate
    )
        external
        payable
        returns(GelatoUserProxy userProxy);



    /// @notice Like create but for submitting a Task Cycle to Gelato. A
    //   Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed
    /// @dev CAUTION: _sumOfRequestedTaskSubmits does not mean the number of cycles.
    /// @param _actions Optional actions to execute.
    /// @param _provider Gelato Provider object for _tasks: provider address and module.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _sumOfRequestedTaskSubmits The TOTAL number of Task auto-submits
    //   that should have occured once the cycle is complete:
    ///  1) _sumOfRequestedTaskSubmits=X: number of times to run the same task or the sum
    ///   of total cyclic task executions in the case of a sequence of different tasks.
    ///  2) _submissionsLeft=0: infinity - run the same task or sequence of tasks infinitely.
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    function createAndSubmitTaskChain(
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _sumOfRequestedTaskSubmits,
        uint256 _expiryDate
    )
        external
        payable
        returns(GelatoUserProxy userProxy);

    /// @notice Just like createAndSubmitTaskChain just using create2, thus allowing for
    ///  knowing the address the GelatoUserProxy will be assigned to in advance.
    /// @param _saltNonce salt is generated thusly: keccak256(abi.encode(_user, _saltNonce))
    function createTwoAndSubmitTaskChain(
        uint256 _saltNonce,
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _sumOfRequestedTaskSubmits,
        uint256 _expiryDate
    )
        external
        payable
        returns(GelatoUserProxy userProxy);

    // ______ State Read APIs __________________
    function predictProxyAddress(address _user, uint256 _saltNonce)
        external
        view
        returns(address);

    /// @notice Get address of proxy contract from user address (EOA)
    /// @param _user Address of user (EOA)
    /// @return Proxy contract address
    function gelatoProxyByUser(address _user) external view returns(GelatoUserProxy);

    /// @notice Get address of user (EOA) from proxy contract address
    /// @param _proxy Address of proxy contract
    /// @return User (EOA) address
    function userByGelatoProxy(GelatoUserProxy _proxy) external view returns(address);

    /// @notice Check if proxy was deployed from gelato proxy factory
    /// @param _proxy Address of proxy contract
    /// @return true if it was deployed from gelato user proxy factory
    function isGelatoUserProxy(address _proxy) external view returns(bool);

    /// @notice Check if user has deployed a proxy from gelato proxy factory
    /// @param _user Address of user contract
    /// @return true if user deployed a proxy from gelato user proxy factory
    function isGelatoProxyUser(address _user) external view returns(bool);

    /// @notice Returns address of gelato
    /// @return Gelato core address
    function gelatoCore() external pure returns(address);

    /// @notice Returns the CreationCode used by the Factory to create GelatoUserProxies.
    /// @dev This is internally used by the factory to predict the address during create2.
    function proxyCreationCode() external pure returns(bytes memory);
}