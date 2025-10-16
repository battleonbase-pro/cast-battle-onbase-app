// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/IDebatePool.sol";

/**
 * @title DebatePool
 * @dev Main contract for managing debate pools with USDC entry fees
 * @notice This contract handles debate creation, participant management, and automated payouts
 */
contract DebatePool is IDebatePool, ReentrancyGuard, Ownable, EIP712 {
    using ECDSA for bytes32;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 20; // 20% platform fee
    uint256 public constant BASIS_POINTS = 10000;
    
    // State variables
    IERC20 public immutable usdcToken;
    address public immutable oracle; // AI judge oracle address
    
    uint256 public nextDebateId = 1;
    mapping(uint256 => Debate) public debates;
    mapping(address => uint256[]) public userDebates;
    
    // EIP-712 type hash for winner results
    bytes32 private constant WINNER_RESULT_TYPEHASH = keccak256(
        "WinnerResult(uint256 debateId,address winner,uint256 timestamp)"
    );

    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle, "DebatePool: Only oracle can call this function");
        _;
    }

    modifier validDebate(uint256 debateId) {
        require(debateId > 0 && debateId < nextDebateId, "DebatePool: Invalid debate ID");
        _;
    }

    modifier debateActive(uint256 debateId) {
        Debate storage debate = debates[debateId];
        require(debate.isActive, "DebatePool: Debate is not active");
        require(block.timestamp >= debate.startTime, "DebatePool: Debate has not started");
        require(block.timestamp <= debate.endTime, "DebatePool: Debate has ended");
        _;
    }

    /**
     * @dev Constructor
     * @param _usdcToken USDC token address on Base Sepolia
     * @param _oracle Oracle address (AI judge backend)
     */
    constructor(
        address _usdcToken,
        address _oracle
    ) EIP712("DebatePool", "1") {
        require(_usdcToken != address(0), "DebatePool: Invalid USDC address");
        require(_oracle != address(0), "DebatePool: Invalid oracle address");
        
        usdcToken = IERC20(_usdcToken);
        oracle = _oracle;
    }

    /**
     * @dev Create a new debate
     * @param topic Debate topic
     * @param entryFee Entry fee in USDC (with decimals)
     * @param maxParticipants Maximum number of participants
     * @param duration Duration in seconds
     * @return debateId The ID of the created debate
     */
    function createDebate(
        string memory topic,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 duration
    ) external onlyOwner returns (uint256) {
        require(bytes(topic).length > 0, "DebatePool: Topic cannot be empty");
        require(entryFee > 0, "DebatePool: Entry fee must be greater than 0");
        require(maxParticipants > 1, "DebatePool: Must allow at least 2 participants");
        require(duration > 0, "DebatePool: Duration must be greater than 0");

        uint256 debateId = nextDebateId++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        debates[debateId] = Debate({
            id: debateId,
            topic: topic,
            entryFee: entryFee,
            maxParticipants: maxParticipants,
            startTime: startTime,
            endTime: endTime,
            participants: new address[](0),
            winner: address(0),
            isActive: true,
            isCompleted: false
        });

        emit DebateCreated(debateId, topic, entryFee);
        return debateId;
    }

    /**
     * @dev Join a debate by paying entry fee
     * @param debateId ID of the debate to join
     */
    function joinDebate(uint256 debateId) 
        external 
        validDebate(debateId) 
        debateActive(debateId) 
        nonReentrant 
    {
        Debate storage debate = debates[debateId];
        
        require(debate.participants.length < debate.maxParticipants, "DebatePool: Debate is full");
        require(!_isParticipant(debateId, msg.sender), "DebatePool: Already participating");

        // Transfer USDC entry fee
        require(
            usdcToken.transferFrom(msg.sender, address(this), debate.entryFee),
            "DebatePool: USDC transfer failed"
        );

        debate.participants.push(msg.sender);
        userDebates[msg.sender].push(debateId);

        emit ParticipantJoined(debateId, msg.sender);
    }

    /**
     * @dev Declare winner and distribute rewards
     * @param result Winner result with signature
     */
    function declareWinner(WinnerResult memory result) 
        external 
        validDebate(result.debateId) 
        nonReentrant 
    {
        Debate storage debate = debates[result.debateId];
        
        require(debate.isActive, "DebatePool: Debate is not active");
        require(!debate.isCompleted, "DebatePool: Winner already declared");
        require(debate.participants.length > 0, "DebatePool: No participants");
        require(_isParticipant(result.debateId, result.winner), "DebatePool: Winner not a participant");
        
        // Verify signature
        require(_verifyWinnerResult(result), "DebatePool: Invalid signature");

        // Calculate rewards
        uint256 totalPool = debate.entryFee * debate.participants.length;
        uint256 platformFee = (totalPool * PLATFORM_FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 winnerPrize = totalPool - platformFee;

        // Update debate state
        debate.winner = result.winner;
        debate.isActive = false;
        debate.isCompleted = true;

        // Transfer rewards
        if (winnerPrize > 0) {
            require(
                usdcToken.transfer(result.winner, winnerPrize),
                "DebatePool: Winner transfer failed"
            );
        }

        emit WinnerDeclared(result.debateId, result.winner, winnerPrize);
    }

    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "DebatePool: No funds to withdraw");
        
        require(
            usdcToken.transfer(owner(), balance),
            "DebatePool: Withdrawal failed"
        );

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Get debate details
     * @param debateId ID of the debate
     * @return Debate struct
     */
    function getDebate(uint256 debateId) external view validDebate(debateId) returns (Debate memory) {
        return debates[debateId];
    }

    /**
     * @dev Get all active debate IDs
     * @return Array of active debate IDs
     */
    function getActiveDebates() external view returns (uint256[] memory) {
        uint256[] memory activeDebates = new uint256[](nextDebateId - 1);
        uint256 count = 0;

        for (uint256 i = 1; i < nextDebateId; i++) {
            if (debates[i].isActive) {
                activeDebates[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeDebates[i];
        }

        return result;
    }

    /**
     * @dev Get user's debate history
     * @param user User address
     * @return Array of debate IDs user participated in
     */
    function getUserDebates(address user) external view returns (uint256[] memory) {
        return userDebates[user];
    }

    /**
     * @dev Check if address is participant in debate
     * @param debateId ID of the debate
     * @param participant Address to check
     * @return True if participant
     */
    function _isParticipant(uint256 debateId, address participant) internal view returns (bool) {
        address[] memory participants = debates[debateId].participants;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == participant) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Verify EIP-712 signature for winner result
     * @param result Winner result to verify
     * @return True if signature is valid
     */
    function _verifyWinnerResult(WinnerResult memory result) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                WINNER_RESULT_TYPEHASH,
                result.debateId,
                result.winner,
                result.timestamp
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(result.signature);
        
        return signer == oracle;
    }

    /**
     * @dev Get contract balance
     * @return USDC balance in contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
}
