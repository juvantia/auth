import { WalletLinkService } from "./service";
import { PostgresWalletLinkStore } from "./postgres-store";
import { createViemWalletSignatureVerifier } from "./viem-verifier";

let walletLinkService: WalletLinkService | undefined;

export function getWalletLinkService(): WalletLinkService {
    walletLinkService ??= new WalletLinkService({
        store: new PostgresWalletLinkStore(),
        verifier: createViemWalletSignatureVerifier(),
    });
    return walletLinkService;
}
