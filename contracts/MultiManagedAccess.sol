// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract MultiManagedAccess {
    // uint constant MANAGER_NUMBERS = 5;
    uint immutable BACKUP_MANAGER_NUMBERS;

    address public owner;
    address[] public managers;
    bool[] public confirmed;

    constructor(
        address _owner,
        address[] memory _managers,
        uint _manager_numbers
    ) {
        require(_managers.length == _manager_numbers, "size unmatched");
        owner = _owner;
        BACKUP_MANAGER_NUMBERS = _manager_numbers;
        for (uint i = 0; i < _manager_numbers; i++) {
            // 매니저 주소와 확인 상태를 초기화
            managers.push(_managers[i]);
            confirmed.push(false);
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    function allConfirmed() internal view returns (bool) {
        for (uint i = 0; i < BACKUP_MANAGER_NUMBERS; i++) {
            if (!confirmed[i]) {
                return false;
            }
        }
        return true;
    }

    modifier onlyAllConfirmed() {
        require(allConfirmed(), "Not all managers confirmed yet");
        reset();
        _;
    }

    function reset() internal {
        for (uint i = 0; i < BACKUP_MANAGER_NUMBERS; i++) {
            confirmed[i] = false;
        }
    }

    function confirm() external {
        bool found = false;
        for (uint i = 0; i < BACKUP_MANAGER_NUMBERS; i++) {
            if (managers[i] == msg.sender) {
                found = true;
                confirmed[i] = true;
                break;
            }
        }
        require(found, "You are not one of managers");
    }
}
