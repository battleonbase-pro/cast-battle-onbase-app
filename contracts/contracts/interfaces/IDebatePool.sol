// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDebatePool
 * @dev Interface for DebatePool contract
 */
interface IDebatePool {
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

    event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee);
    event ParticipantJoined(uint256 indexed debateId, address indexed participant);
    event WinnerDeclared(uint256 indexed debateId, address indexed winner, uint256 prize);
    event FundsWithdrawn(address indexed to, uint256 amount);

    function createDebate(
        string memory topic,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 duration
    ) external returns (uint256);

    function joinDebate(uint256 debateId) external;

    function declareWinner(WinnerResult memory result) external;

    function withdrawFunds() external;

    function getDebate(uint256 debateId) external view returns (Debate memory);

    function getActiveDebates() external view returns (uint256[] memory);
}