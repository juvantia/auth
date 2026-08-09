import { z } from "zod";

export const RequestIdSchema = z.string().min(1).max(128);

export const ErrorFieldsSchema = z.record(z.array(z.string()));

export const ErrorEnvelopeSchema = z
    .object({
        success: z.literal(false),
        error: z
            .object({
                code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
                message: z.string().min(1),
                requestId: RequestIdSchema,
                fields: ErrorFieldsSchema.optional(),
            })
            .strict(),
    })
    .strict();

export function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
    return z
        .object({
            success: z.literal(true),
            data,
            meta: z.object({ requestId: RequestIdSchema }).strict().optional(),
        })
        .strict();
}

export function zodErrorFields(error: z.ZodError): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "request";
        fields[path] ??= [];
        fields[path].push(issue.message);
    }
    return fields;
}
