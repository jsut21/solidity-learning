// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract NativeBank {
    mapping(address => uint256) public balanceOf;
    bool lock;

    modifier noReentrant() {
        require(!lock, "is working on");
        lock = true;
        _;
        lock = false;
    }

    function withdraw() external noReentrant {
        uint256 balance = balanceOf[msg.sender];
        require(balance > 0, "insufficient balance");

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "failed to send native token");

        balanceOf[msg.sender] = 0;
    }

    receive() external payable {
        balanceOf[msg.sender] += msg.value;
    }
}
