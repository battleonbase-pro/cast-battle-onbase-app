import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "ethers";

export class EIP712Signer {
  private contractAddress: string;
  private name: string;
  private version: string;

  constructor(contractAddress: string, name: string, version: string) {
    this.contractAddress = contractAddress;
    this.name = name;
    this.version = version;
  }

  async signWinnerDistribution(
    signer: SignerWithAddress,
    debateId: bigint | number,
    winner: string,
    winnerPrize: bigint
  ): Promise<string> {
    // Get chain ID from the signer's provider
    const provider = signer.provider;
    if (!provider) {
      throw new Error("Signer must have a provider");
    }
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Domain separator for EIP-712
    const domain = {
      name: this.name,
      version: this.version,
      chainId: chainId,
      verifyingContract: this.contractAddress,
    };

    // Types definition
    const types = {
      WinnerDistribution: [
        { name: "debateId", type: "uint256" },
        { name: "winner", type: "address" },
        { name: "winnerPrize", type: "uint256" },
      ],
    };

    // Value to sign
    const value = {
      debateId: BigInt(debateId),
      winner: winner,
      winnerPrize: winnerPrize,
    };

    // Use ethers signTypedData which handles EIP-712 correctly
    const signature = await signer.signTypedData(domain, types, value);
    return signature;
  }

  async signMessage(signer: SignerWithAddress, messageHash: string): Promise<string> {
    // For refund signatures, we'll use the message hash directly
    const hash = ethers.getBytes(messageHash);
    const signature = await signer.signMessage(hash);
    return signature;
  }

  // Helper to create EIP-712 hash manually if needed
  createHash(types: any, value: any): string {
    return ethers.TypedDataEncoder.hash(this.domain, types, value);
  }
}

