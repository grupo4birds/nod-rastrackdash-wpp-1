"use server";

import {
  whatsappInstanceCreateInputSchema,
  whatsappInstanceCreateResultSchema,
  whatsappInstanceRefreshResultSchema,
  type WhatsappInstanceStatusDto,
} from "@wpptrack/shared";
import { revalidatePath } from "next/cache";
import { isApiRequestError, serverApiFetch } from "../../../lib/server-api";

const controlCharPattern = new RegExp(
  "[" +
    String.fromCharCode(0) +
    "-" +
    String.fromCharCode(31) +
    String.fromCharCode(127) +
    "]",
  "u",
);

export type WhatsappInstanceActionResult = {
  ok: boolean;
  message: string;
};

export type WhatsappInstanceCreateActionResult = WhatsappInstanceActionResult & {
  instance?: {
    id: string;
    status: WhatsappInstanceStatusDto;
    qrCode: string | null;
  };
};

export type WhatsappInstanceRefreshActionResult = WhatsappInstanceActionResult & {
  status?: WhatsappInstanceStatusDto;
  qrCode?: string | null;
  connectedPhone?: string | null;
};

const integrationsPath = "/integrations";
const invalidFormMessage = "Revise os dados informados e tente novamente.";
const genericCreateErrorMessage = "Nao foi possivel criar a instancia agora.";
const genericRefreshErrorMessage =
  "Nao foi possivel atualizar o status da instancia.";
const genericRemoveErrorMessage = "Nao foi possivel remover esta instancia.";

export async function createWhatsappInstanceAction(
  formData: FormData,
): Promise<WhatsappInstanceCreateActionResult> {
  const input = whatsappInstanceCreateInputSchema.safeParse({
    name: formText(formData, "name"),
    instanceToken: formText(formData, "instanceToken"),
  });

  if (!input.success) {
    return failure(invalidFormMessage);
  }

  try {
    const response = await serverApiFetch<unknown>(
      "/integrations/whatsapp-instances",
      {
        method: "POST",
        body: JSON.stringify(input.data),
      },
    );
    const result = whatsappInstanceCreateResultSchema.safeParse(response);

    if (!result.success) {
      return failure(genericCreateErrorMessage);
    }

    revalidatePath(integrationsPath);

    return {
      ok: true,
      message:
        result.data.message ??
        "Instancia criada. Escaneie o QR code para conectar.",
      instance: {
        id: result.data.id,
        status: result.data.status,
        qrCode: result.data.qrCode,
      },
    };
  } catch (error) {
    return failure(apiErrorMessage(error, genericCreateErrorMessage));
  }
}

export async function refreshWhatsappInstanceAction(
  formData: FormData,
): Promise<WhatsappInstanceRefreshActionResult> {
  const instanceId = formId(formData, "instanceId");

  if (!instanceId) {
    return failure(invalidFormMessage);
  }

  try {
    const response = await serverApiFetch<unknown>(
      `/integrations/whatsapp-instances/${encodeURIComponent(instanceId)}/refresh`,
      {
        method: "POST",
        body: "{}",
      },
    );
    const result = whatsappInstanceRefreshResultSchema.safeParse(response);

    if (!result.success) {
      return failure(genericRefreshErrorMessage);
    }

    revalidatePath(integrationsPath);

    return {
      ok: true,
      message: result.data.message ?? "Status atualizado.",
      status: result.data.status,
      qrCode: result.data.qrCode,
      connectedPhone: result.data.connectedPhone,
    };
  } catch (error) {
    return failure(apiErrorMessage(error, genericRefreshErrorMessage));
  }
}

export async function deleteWhatsappInstanceAction(
  formData: FormData,
): Promise<WhatsappInstanceActionResult> {
  const instanceId = formId(formData, "instanceId");

  if (!instanceId) {
    return failure(invalidFormMessage);
  }

  try {
    await serverApiFetch<void>(
      `/integrations/whatsapp-instances/${encodeURIComponent(instanceId)}`,
      { method: "DELETE" },
    );

    revalidatePath(integrationsPath);

    return { ok: true, message: "Instancia removida." };
  } catch (error) {
    return failure(apiErrorMessage(error, genericRemoveErrorMessage));
  }
}

function formText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formId(formData: FormData, key: string): string | null {
  const value = formText(formData, key);

  if (!value || value.length > 255 || controlCharPattern.test(value)) {
    return null;
  }

  return value;
}

function failure(message: string): WhatsappInstanceActionResult {
  return { ok: false, message };
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return isApiRequestError(error) && error.message.trim()
    ? error.message
    : fallback;
}
