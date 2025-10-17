"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeCast__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        inputs: [
            {
                internalType: "uint8",
                name: "bits",
                type: "uint8",
            },
            {
                internalType: "int256",
                name: "value",
                type: "int256",
            },
        ],
        name: "SafeCastOverflowedIntDowncast",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "int256",
                name: "value",
                type: "int256",
            },
        ],
        name: "SafeCastOverflowedIntToUint",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint8",
                name: "bits",
                type: "uint8",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "SafeCastOverflowedUintDowncast",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "SafeCastOverflowedUintToInt",
        type: "error",
    },
];
const _bytecode = "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea264697066735822122063d95222b5ea62787fc9537acbe3b573a51dff433b26165983ac2e2e94c5ae3764736f6c63430008140033";
const isSuperArgs = (xs) => xs.length > 1;
class SafeCast__factory extends ethers_1.ContractFactory {
    constructor(...args) {
        if (isSuperArgs(args)) {
            super(...args);
        }
        else {
            super(_abi, _bytecode, args[0]);
        }
    }
    getDeployTransaction(overrides) {
        return super.getDeployTransaction(overrides || {});
    }
    deploy(overrides) {
        return super.deploy(overrides || {});
    }
    connect(runner) {
        return super.connect(runner);
    }
    static createInterface() {
        return new ethers_1.Interface(_abi);
    }
    static connect(address, runner) {
        return new ethers_1.Contract(address, _abi, runner);
    }
}
exports.SafeCast__factory = SafeCast__factory;
SafeCast__factory.bytecode = _bytecode;
SafeCast__factory.abi = _abi;
