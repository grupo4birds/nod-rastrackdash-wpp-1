import { z } from "zod";

// Only the three states this feature actually surfaces to the frontend; the
// underlying Prisma WhatsappInstanceStatus enum also has "pending_payment"
// and "suspended", which this service never returns (see
// apps/api/src/whatsapp-instances/whatsapp-instances.service.ts).
export const whatsappInstanceApiStatuses = [
  "disconnected",
  "active",
  "error",
] as const;

export const whatsappInstanceStatusSchema = z.enum(whatsappInstanceApiStatuses);

const idSchema = z.string().trim().min(1).max(255);

const controlCharPattern = new RegExp(
  "[" + String.fromCharCode(0) + "-" + String.fromCharCode(31) + String.fromCharCode(127) + "<>]",
  "u",
);

export const whatsappInstanceNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .refine((value) => !controlCharPattern.test(value), {
    message: "Nome de instancia invalido",
  });

// The instance itself is created on the workspace owner's own Uazapi server
// dashboard (outside RastrackDash); this is the token that dashboard hands
// back for that instance. No format is assumed beyond "non-trivial string"
// since Uazapi's own token shape isn't documented here.
export const whatsappInstanceTokenSchema = z.string().trim().min(10).max(500);

export const whatsappInstanceCreateInputSchema = z.object({
  name: whatsappInstanceNameSchema,
  instanceToken: whatsappInstanceTokenSchema,
});

export const whatsappInstanceDtoSchema = z.object({
  id: idSchema,
  name: whatsappInstanceNameSchema,
  status: whatsappInstanceStatusSchema,
  providerInstanceId: idSchema.nullable(),
  createdAt: z.string().datetime(),
});

export const whatsappInstanceListSchema = z.array(whatsappInstanceDtoSchema);

export const whatsappInstanceCreateResultSchema = z.object({
  id: idSchema,
  status: whatsappInstanceStatusSchema,
  qrCode: z.string().nullable(),
  message: z.string().nullable(),
});

export const whatsappInstanceRefreshResultSchema = z.object({
  status: whatsappInstanceStatusSchema,
  qrCode: z.string().nullable(),
  connectedPhone: z.string().nullable(),
  message: z.string().nullable(),
});

export type WhatsappInstanceStatusDto = z.infer<
  typeof whatsappInstanceStatusSchema
>;
export type WhatsappInstanceCreateInputDto = z.infer<
  typeof whatsappInstanceCreateInputSchema
>;
export type WhatsappInstanceDto = z.infer<typeof whatsappInstanceDtoSchema>;
export type WhatsappInstanceListDto = z.infer<
  typeof whatsappInstanceListSchema
>;
export type WhatsappInstanceCreateResultDto = z.infer<
  typeof whatsappInstanceCreateResultSchema
>;
export type WhatsappInstanceRefreshResultDto = z.infer<
  typeof whatsappInstanceRefreshResultSchema
>;
