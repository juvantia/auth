export function blockchainChainId(): number {
    const raw = process.env.BLOCKCHAIN_CHAIN_ID?.trim() || "10200";
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error("BLOCKCHAIN_CHAIN_ID must be a positive safe integer");
    }
    return value;
}
