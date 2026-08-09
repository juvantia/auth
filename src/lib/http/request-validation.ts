import { z } from "zod";
import { zodErrorFields } from "@/contracts/api";

export class RequestValidationError extends Error {
    constructor(public readonly fields?: Record<string, string[]>) {
        super("The request does not match the published API contract.");
        this.name = "RequestValidationError";
    }
}

export async function parseJsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new RequestValidationError({ request: ["Request body must be valid JSON."] });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new RequestValidationError(zodErrorFields(parsed.error));
    return parsed.data;
}
