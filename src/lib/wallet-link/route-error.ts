import { errorResponse } from "@/lib/http/api-response";
import { RequestValidationError } from "@/lib/http/request-validation";
import { WalletLinkError } from "./errors";

export function walletLinkRouteError(requestId: string, error: unknown) {
    if (error instanceof RequestValidationError) {
        return errorResponse(requestId, 400, "INVALID_REQUEST", error.message, error.fields);
    }
    if (error instanceof WalletLinkError) {
        return errorResponse(requestId, error.status, error.code, error.message);
    }
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not complete the request.");
}
