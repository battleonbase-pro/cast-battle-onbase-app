"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strings__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "length",
                type: "uint256",
            },
        ],
        name: "StringsInsufficientHexLength",
        type: "error",
    },
    {
        inputs: [],
        name: "StringsInvalidAddressFormat",
        type: "error",
    },
    {
        inputs: [],
        name: "StringsInvalidChar",
        type: "error",
    },
];
const _bytecode = "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea2646970667358221220677e3c854be68dbdb2873158d043dc545cd4ba5496c09e950a4a3a89d7bd9e3464736f6c63430008140033";
const isSuperArgs = (xs) => xs.length > 1;
class Strings__factory extends ethers_1.ContractFactory {
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
exports.Strings__factory = Strings__factory;
Strings__factory.bytecode = _bytecode;
Strings__factory.abi = _abi;
