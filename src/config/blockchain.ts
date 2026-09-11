export function blockchainChainId(): number {
    const value = Number(process.env.BLOCKCHAIN_CHAIN_ID);
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error("BLOCKCHAIN_CHAIN_ID must be a positive safe integer");
    }
    return value;
}
