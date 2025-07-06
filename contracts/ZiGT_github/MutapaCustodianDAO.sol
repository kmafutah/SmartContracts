// MutapaCustodianDAO.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;
contract MutapaCustodianDAO {
    address[] public committee;
    mapping(address => bool) public isMember;

    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event Approved(string action);

    modifier onlyCommittee() {
        require(isMember[msg.sender], "Not committee");
        _;
    }

    constructor(address[] memory members) {
        for (uint i = 0; i < members.length; i++) {
            isMember[members[i]] = true;
            committee.push(members[i]);
        }
    }

    function approveMint(address controller, address to, uint256 amount) external onlyCommittee {
        SubZiGTController(controller).mintSubZiGT(to, amount);
        emit Approved("mint");
    }

    function addMember(address member) external onlyCommittee {
        isMember[member] = true;
        committee.push(member);
        emit MemberAdded(member);
    }

    function removeMember(address member) external onlyCommittee {
        isMember[member] = false;
        emit MemberRemoved(member);
    }
}

interface SubZiGTController {
    function mintSubZiGT(address to, uint256 amount) external;
}
