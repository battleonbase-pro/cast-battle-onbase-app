// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract BattleToken is ERC20, Ownable, ERC20Burnable, ERC20Permit {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B max supply
    
    // Distribution addresses
    address public rewardsWallet;
    address public communityWallet;
    address public teamWallet;
    address public treasuryWallet;
    
    // Battle rewards
    uint256 public constant WINNER_REWARD = 1000 * 10**18; // 1000 BATTLE
    uint256 public constant RUNNER_UP_REWARD = 500 * 10**18; // 500 BATTLE
    uint256 public constant PARTICIPATION_REWARD = 50 * 10**18; // 50 BATTLE
    uint256 public constant VOTING_REWARD = 10 * 10**18; // 10 BATTLE
    
    // Events
    event BattleRewardDistributed(address indexed winner, uint256 amount, string battleId);
    event ParticipationRewardDistributed(address indexed participant, uint256 amount, string battleId);
    event VotingRewardDistributed(address indexed voter, uint256 amount, string battleId);
    
    constructor() ERC20("Battle Token", "BATTLE") ERC20Permit("Battle Token") {
        // Mint initial supply to deployer
        _mint(msg.sender, TOTAL_SUPPLY);
        
        // Set initial distribution wallets (can be changed later)
        rewardsWallet = msg.sender;
        communityWallet = msg.sender;
        teamWallet = msg.sender;
        treasuryWallet = msg.sender;
    }
    
    // Mint new tokens (only owner, up to max supply)
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    // Distribute battle rewards
    function distributeBattleReward(address winner, string memory battleId) external onlyOwner {
        _transfer(rewardsWallet, winner, WINNER_REWARD);
        emit BattleRewardDistributed(winner, WINNER_REWARD, battleId);
    }
    
    function distributeRunnerUpReward(address runnerUp, string memory battleId) external onlyOwner {
        _transfer(rewardsWallet, runnerUp, RUNNER_UP_REWARD);
        emit BattleRewardDistributed(runnerUp, RUNNER_UP_REWARD, battleId);
    }
    
    function distributeParticipationReward(address participant, string memory battleId) external onlyOwner {
        _transfer(rewardsWallet, participant, PARTICIPATION_REWARD);
        emit ParticipationRewardDistributed(participant, PARTICIPATION_REWARD, battleId);
    }
    
    function distributeVotingReward(address voter, string memory battleId) external onlyOwner {
        _transfer(rewardsWallet, voter, VOTING_REWARD);
        emit VotingRewardDistributed(voter, VOTING_REWARD, battleId);
    }
    
    // Update distribution wallets
    function setRewardsWallet(address _wallet) external onlyOwner {
        rewardsWallet = _wallet;
    }
    
    function setCommunityWallet(address _wallet) external onlyOwner {
        communityWallet = _wallet;
    }
    
    function setTeamWallet(address _wallet) external onlyOwner {
        teamWallet = _wallet;
    }
    
    function setTreasuryWallet(address _wallet) external onlyOwner {
        treasuryWallet = _wallet;
    }
    
    // Emergency functions
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        _transfer(address(this), owner(), amount);
    }
    
    // Batch reward distribution
    function batchDistributeRewards(
        address[] memory winners,
        address[] memory participants,
        address[] memory voters,
        string memory battleId
    ) external onlyOwner {
        // Distribute winner rewards
        for (uint256 i = 0; i < winners.length; i++) {
            if (i == 0) {
                _transfer(rewardsWallet, winners[i], WINNER_REWARD);
            } else if (i == 1) {
                _transfer(rewardsWallet, winners[i], RUNNER_UP_REWARD);
            }
        }
        
        // Distribute participation rewards
        for (uint256 i = 0; i < participants.length; i++) {
            _transfer(rewardsWallet, participants[i], PARTICIPATION_REWARD);
        }
        
        // Distribute voting rewards
        for (uint256 i = 0; i < voters.length; i++) {
            _transfer(rewardsWallet, voters[i], VOTING_REWARD);
        }
    }
}
