import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";

export function ensureSuperTokensInitialized(): void {
    try {
        supertokens.init(backendConfig());
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("already been called")) throw error;
    }
}
