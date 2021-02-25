// SPDX-License-Identifier: MIT
pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoProviderModuleStandard} from "../GelatoProviderModuleStandard.sol";
import {Task} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoActionPipeline} from "../../gelato_actions/GelatoActionPipeline.sol";

/// @dev InstaDapp Index
interface IndexInterface {
    function connectors(uint version) external view returns (address);
    function list() external view returns (address);
}

/// @dev InstaDapp List
interface ListInterface {
    function accountID(address _account) external view returns (uint64);
}

/// @dev InstaDapp Connectors
interface ConnectorsInterface {
    function isConnector(address[] calldata logicAddr) external view returns (bool);
    function isStaticConnector(address[] calldata logicAddr) external view returns (bool);
}

/// @dev InstaDapp Defi Smart Account wallet
interface AccountInterface {
    function version() external view returns (uint);
    function isAuth(address user) external view returns (bool);
    function shield() external view returns (bool);
    function cast(address[] calldata _targets, bytes[] calldata _datas, address _origin)
        external
        payable
        returns (bytes32[] memory responses);
}

contract ProviderModuleDSA is GelatoProviderModuleStandard {
    IndexInterface public immutable index;
    address public immutable gelatoCore;

    constructor(IndexInterface _index, address _gelatoCore) public {
        index = _index;
        gelatoCore = _gelatoCore;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(address _userProxy, address, Task calldata)
        external
        view
        override
        returns(string memory)
    {
        // Verify InstaDapp account identity
        if (ListInterface(index.list()).accountID(_userProxy) == 0)
            return "ProviderModuleDSA.isProvided:InvalidUserProxy";

        // Is GelatoCore authorized
        if (!AccountInterface(_userProxy).isAuth(gelatoCore))
            return "ProviderModuleDSA.isProvided:GelatoCoreNotAuth";

        // @dev commented out for gas savings

        // // Is connector valid
        // ConnectorsInterface connectors = ConnectorsInterface(index.connectors(
        //     AccountInterface(_userProxy).version()
        // ));

        // address[] memory targets = new address[](_task.actions.length);
        // for (uint i = 0; i < _task.actions.length; i++)
        //     targets[i] = _task.actions[i].addr;

        // bool isShield = AccountInterface(_userProxy).shield();
        // if (isShield)
        //     if (!connectors.isStaticConnector(targets))
        //         return "ProviderModuleDSA.isProvided:not-static-connector";
        // else
        //     if (!connectors.isConnector(targets))
        //         return "ProviderModuleDSA.isProvided:not-connector";

        return OK;
    }

    /// @dev DS PROXY ONLY ALLOWS DELEGATE CALL for single actions, that's why we also use multisend
    function execPayload(uint256, address, address, Task calldata _task, uint256)
        external
        view
        override
        returns(bytes memory payload, bool)
    {
        address[] memory targets = new address[](_task.actions.length);
        for (uint i = 0; i < _task.actions.length; i++)
            targets[i] = _task.actions[i].addr;

        bytes[] memory datas = new bytes[](_task.actions.length);
        for (uint i = 0; i < _task.actions.length; i++)
            datas[i] = _task.actions[i].data;

        payload = abi.encodeWithSelector(
            AccountInterface.cast.selector,
            targets,
            datas,
            gelatoCore
        );
    }
}