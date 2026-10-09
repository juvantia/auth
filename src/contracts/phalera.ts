import { z } from "zod";

export const FilamentColorSchema = z
    .object({
        name: z.string().min(1).max(32),
        hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        rgb: z.tuple([
            z.number().int().min(0).max(255),
            z.number().int().min(0).max(255),
            z.number().int().min(0).max(255),
        ]),
        dxfColor: z.number().int().min(1).max(255).optional(),
    })
    .strict();

export const PhaleraSlotSchema = z
    .object({
        id: z.string().uuid(),
        slotIndex: z.number().int().min(0).max(9),
        name: z.string().max(64),
        pixels: z.array(z.number().int().min(0).max(15)).length(4096),
        palette: z.array(FilamentColorSchema).min(2).max(16),
        creatorCitizenId: z.string().min(1).max(255),
        ownerCitizenId: z.string().min(1).max(255),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
    })
    .strict();

export const PhaleraSlotsResponseSchema = z
    .object({
        success: z.boolean(),
        slots: z.array(PhaleraSlotSchema.nullable()).length(10),
    })
    .strict();

export type FilamentColor = z.infer<typeof FilamentColorSchema>;
export type PhaleraSlot = z.infer<typeof PhaleraSlotSchema>;
export type PhaleraSlotsResponse = z.infer<typeof PhaleraSlotsResponseSchema>;
