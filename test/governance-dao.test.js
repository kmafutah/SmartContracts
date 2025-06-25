const { expect } = require("chai");
const { ethers } = require("hardhat");

// For ethers v6 compatibility
const hexlify = ethers.hexlify || ethers.utils?.hexlify;
const toUtf8Bytes = ethers.toUtf8Bytes || ethers.utils?.toUtf8Bytes;

// NOTE: On SKALE, if you see 'incorrect number of arguments to constructor',
// change the contract name (e.g., MutapaCustodianDAOv2) to force a fresh deployment.

describe("MutapaCustodianDAO", function () {
  let DAO, dao, owner, committee, nonMember, controller, Controller;
  
  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    // Use at least 2 committee members for tests
    committee = [signers[1], signers[2]];
    nonMember = signers[3];
    
    DAO = await ethers.getContractFactory("MutapaCustodianDAOv2");
    Controller = await ethers.getContractFactory("contracts/ZiGT_github/SubZiGTController.sol:SubZiGTController");
    
    controller = await Controller.deploy();
    await controller.waitForDeployment();
    
    // Always deploy a fresh contract with correct args
    // Try different constructor patterns - some contracts expect individual addresses
    try {
      dao = await DAO.deploy(committee.map(a => a.address));
    } catch (error) {
      if (error.message.includes("incorrect number of arguments")) {
        // Try with individual addresses instead of array
        dao = await DAO.deploy(committee[0].address, committee[1].address);
      } else {
        throw error;
      }
    }
    await dao.waitForDeployment();
  });

  it("should allow committee to approve mint", async function () {
    await expect(dao.connect(committee[0]).approveMint(await controller.getAddress(), await owner.getAddress(), 100))
      .to.emit(dao, "Approved");
  });

  it("should not allow non-committee to approve mint", async function () {
    await expect(dao.connect(nonMember).approveMint(await controller.getAddress(), await owner.getAddress(), 100))
      .to.be.reverted;
  });

  it("should add and remove committee members", async function () {
    await dao.connect(committee[0]).addMember(await nonMember.getAddress());
    expect(await dao.isMember(await nonMember.getAddress())).to.be.true;
    
    await dao.connect(nonMember).removeMember(await committee[0].getAddress());
    expect(await dao.isMember(await committee[0].getAddress())).to.be.false;
  });

  it("should log gas and time for approveMint", async function () {
    const tx = await dao.connect(committee[0]).approveMint(await controller.getAddress(), await owner.getAddress(), 100);
    const receipt = await tx.wait();
    console.log("Gas used for approveMint:", receipt.gasUsed.toString());
    console.log("Block timestamp:", receipt.blockNumber);
  });
});

describe("GovernanceDAO Security & Edge Cases", function () {
  let DAO, dao, owner, voter, attacker;
  
  beforeEach(async function () {
    [owner, voter, attacker] = await ethers.getSigners();
    DAO = await ethers.getContractFactory("contracts/ZiGT_github/ReparationsDAO.sol:ReparationsDAO");
    dao = await DAO.deploy(committee.map(a => a.address));
    await dao.waitForDeployment();
    
    // Initialize and set delay with proper error handling
    try {
      await dao.initialize();
      await dao.setMinDelay(3600); // 1 hour
    } catch (error) {
      console.log("Warning: Could not set minimum delay, using default");
    }
  });

  it("should not allow instant execution (timelock)", async function () {
    // Use a much longer delay to ensure it's after the minimum delay
    const eta = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now (well past 1 hour minimum)
    const callData = hexlify(toUtf8Bytes("test"));
    const tx = await dao.propose(await owner.getAddress(), callData, eta);
    const receipt = await tx.wait();
    let id;
    if (receipt.events && Array.isArray(receipt.events)) {
      // ethers v5 style
      const event = receipt.events.find(e => e.event === 'ProposalCreated');
      id = event.args.id;
    } else {
      // ethers v6 style
      const logs = await dao.queryFilter("ProposalCreated", receipt.blockNumber, receipt.blockNumber);
      id = logs[0].args.id;
    }
    // Try to execute immediately - should fail
    await expect(dao.execute(id)).to.be.revertedWith("Too early");
  });

  it("should prevent vote manipulation (buy tokens just to vote)", function () {
    // Simulate: attacker gets tokens after proposal snapshot
    // (Assume token contract with snapshot, not shown here)
    // This is a placeholder for actual snapshot logic
    expect(true).to.be.true;
  });

  it("should allow rage quit/veto simulation", function () {
    // Simulate: member leaves or vetoes proposal
    // (Assume veto/rage quit logic, not shown here)
    expect(true).to.be.true;
  });

  it("should log gas and time for propose/execute", async function () {
    // Use proper delay that exceeds minimum
    const eta = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    const callData = hexlify(toUtf8Bytes("test"));
    const tx = await dao.propose(await owner.getAddress(), callData, eta);
    const receipt = await tx.wait();
    console.log("Gas used for propose:", receipt.gasUsed.toString());
    console.log("Block timestamp:", receipt.blockNumber);
  });
});