// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDebatePoolV2
 * @dev Interface for DebatePoolV2 contract
 */
interface IDebatePoolV2 {
    // Structs
    struct Debate {
        uint256 id;
        string topic;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 startTime;    // UTC timestamp (seconds since epoch)
        uint256 endTime;      // UTC timestamp (seconds since epoch)
        address[] participants;
        address winner;
        bool isActive;
        bool isCompleted;
    }

    struct WinnerResult {
        uint256 debateId;
        address winner;
        uint256 timestamp;
        bytes signature;
    }

    // Events
    event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee);
    event ParticipantJoined(uint256 indexed debateId, address participant);
    event WinnerDeclared(uint256 indexed debateId, address winner, uint256 prize);
    event RefundProcessed(uint256 indexed debateId, address participant, uint256 amount);
    event EmergencyPauseToggled(bool paused);
    event PointsAwarded(address indexed user, uint256 points, string reason);
    event AirdropSetup(address indexed token, uint256 totalAmount, uint256 snapshotBlock);
    event AirdropClaimed(address indexed user, uint256 amount, uint256 points);

    // Core functions
    function createDebate(
        string memory topic,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 duration
    ) external returns (uint256);

    function joinDebate(uint256 debateId) external;
    function declareWinner(WinnerResult memory result) external;
    function requestRefund(uint256 debateId) external;
    function processExpiredDebate(uint256 debateId) external;
    function emergencyRefund(uint256 debateId) external;

    // Safety functions
    function toggleEmergencyPause() external;

    // Points system
    function awardPoints(address user, uint256 points, string memory reason) external;
    function awardLikePoints(address user) external;
    function awardSharePoints(address user) external;

    // Airdrop system
    function setupAirdrop(address _airdropToken, uint256 _totalAmount) external;
    function claimAirdrop(
        uint256 userPointsAmount,
        uint256 totalPoints,
        bytes32 messageHash,
        bytes memory signature
    ) external;

    // Admin functions
    function withdrawPlatformFees() external;

    // View functions
    function getDebate(uint256 debateId) external view returns (Debate memory);
    function getUserDebates(address user) external view returns (uint256[] memory);
    function getUserPoints(address user) external view returns (uint256);
    function isParticipant(uint256 debateId, address user) external view returns (bool);
}
