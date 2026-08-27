"use client";

import type { WhatsappInstanceDto } from "@wpptrack/shared";
import { Plus, QrCode, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  WhatsappInstanceActionResult,
  WhatsappInstanceCreateActionResult,
  WhatsappInstanceRefreshActionResult,
} from "./whatsapp-instance-actions";

type CreateAction = (
  formData: FormData,
) => Promise<WhatsappInstanceCreateActionResult>;
type RefreshAction = (
  formData: FormData,
) => Promise<WhatsappInstanceRefreshActionResult>;
type RemoveAction = (
  formData: FormData,
) => Promise<WhatsappInstanceActionResult>;

export type WhatsappInstancePanelProps = {
  instances: WhatsappInstanceDto[];
  canManage: boolean;
  createAction: CreateAction;
  refreshAction: RefreshAction;
  removeAction: RemoveAction;
};

type PanelNotice = {
  tone: "success" | "error";
  message: string;
};

type PendingConnection = {
  instanceId: string;
  qrCode: string | null;
  startedAt: number;
};

const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 120_000;

function statusLabel(status: WhatsappInstanceDto["status"]): string {
  if (status === "active") {
    return "Conectado";
  }

  if (status === "error") {
    return "Erro";
  }

  return "Aguardando conexao";
}

function statusTone(status: WhatsappInstanceDto["status"]): string {
  if (status === "active") {
    return "";
  }

  if (status === "error") {
    return "warn";
  }

  return "warn";
}

function qrImageSrc(qrCode: string): string {
  return qrCode.startsWith("data:")
    ? qrCode
    : `data:image/png;base64,${qrCode}`;
}

export function WhatsappInstancePanel({
  instances,
  canManage,
  createAction,
  refreshAction,
  removeAction,
}: WhatsappInstancePanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(instances.length === 0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<PanelNotice | null>(null);
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pendingConnectionRef = useRef(pendingConnection);
  pendingConnectionRef.current = pendingConnection;

  useEffect(() => {
    if (!pendingConnection) {
      return;
    }

    const interval = setInterval(() => {
      void pollConnection();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConnection?.instanceId, pendingConnection?.startedAt]);

  async function pollConnection() {
    const current = pendingConnectionRef.current;

    if (!current) {
      return;
    }

    if (Date.now() - current.startedAt > POLL_TIMEOUT_MS) {
      setPollTimedOut(true);
      setPendingConnection(null);
      return;
    }

    const formData = new FormData();
    formData.set("instanceId", current.instanceId);
    const result = await refreshAction(formData);

    if (!result.ok) {
      return;
    }

    if (result.status === "active") {
      setPendingConnection(null);
      setNotice({
        tone: "success",
        message: result.message,
      });
      router.refresh();
      return;
    }

    if (result.qrCode) {
      setPendingConnection({
        ...current,
        qrCode: result.qrCode,
      });
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pendingAction) {
      return;
    }

    const form = event.currentTarget;
    setPendingAction("create");
    setNotice(null);
    setPollTimedOut(false);
    const result = await createAction(new FormData(form));

    setNotice({ tone: result.ok ? "success" : "error", message: result.message });

    if (result.ok && result.instance) {
      form.reset();
      setCreateOpen(false);

      if (result.instance.status === "active") {
        router.refresh();
      } else {
        setPendingConnection({
          instanceId: result.instance.id,
          qrCode: result.instance.qrCode,
          startedAt: Date.now(),
        });
      }
    }

    setPendingAction(null);
  }

  async function handleRetryQr(instanceId: string) {
    if (pendingAction) {
      return;
    }

    setPendingAction(`retry-${instanceId}`);
    setPollTimedOut(false);
    const formData = new FormData();
    formData.set("instanceId", instanceId);
    const result = await refreshAction(formData);

    setNotice({ tone: result.ok ? "success" : "error", message: result.message });

    if (result.ok && result.status !== "active") {
      setPendingConnection({
        instanceId,
        qrCode: result.qrCode ?? null,
        startedAt: Date.now(),
      });
    } else if (result.ok) {
      router.refresh();
    }

    setPendingAction(null);
  }

  async function handleRemove(instanceId: string) {
    if (pendingAction) {
      return;
    }

    if (
      !window.confirm(
        "Remover esta instancia? O historico de leads recebidos por ela sera preservado, mas a conexao com o WhatsApp sera encerrada.",
      )
    ) {
      return;
    }

    setPendingAction(`remove-${instanceId}`);
    const formData = new FormData();
    formData.set("instanceId", instanceId);
    const result = await removeAction(formData);

    setNotice({ tone: result.ok ? "success" : "error", message: result.message });

    if (result.ok) {
      if (pendingConnectionRef.current?.instanceId === instanceId) {
        setPendingConnection(null);
      }
      router.refresh();
    }

    setPendingAction(null);
  }

  return (
    <section className="surface-panel whatsapp-instance-panel">
      <div className="inbound-webhook-heading">
        <div>
          <span className="eyebrow">WhatsApp Business</span>
          <h2>Instancias WhatsApp (Uazapi)</h2>
          <p className="muted">
            Conecte um numero de WhatsApp escaneando o QR code diretamente
            aqui. As mensagens recebidas aparecem como Leads para
            visualizacao.
          </p>
        </div>
        {canManage ? (
          <button
            className="button"
            type="button"
            onClick={() => setCreateOpen((current) => !current)}
            aria-expanded={createOpen}
          >
            {createOpen ? (
              <X size={16} aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            {createOpen ? "Fechar" : "Nova instancia"}
          </button>
        ) : (
          <span className="status-chip">Somente leitura</span>
        )}
      </div>

      {createOpen && canManage ? (
        <form className="inbound-webhook-create" onSubmit={handleCreate}>
          <p className="action-note">
            Crie a instancia no painel do seu proprio servidor Uazapi
            primeiro e cole o token dela aqui.
          </p>
          <label>
            <span className="field-label">Nome da instancia</span>
            <input
              name="name"
              minLength={2}
              maxLength={120}
              placeholder="Ex.: Comercial - unidade 1"
              required
              disabled={pendingAction === "create"}
            />
          </label>
          <label>
            <span className="field-label">Token da instancia</span>
            <input
              name="instanceToken"
              type="password"
              minLength={10}
              maxLength={500}
              autoComplete="off"
              placeholder="Cole o token gerado no seu servidor Uazapi"
              required
              disabled={pendingAction === "create"}
              data-presentation-sensitive-field="true"
            />
          </label>
          <button
            className="button primary"
            type="submit"
            disabled={pendingAction === "create"}
          >
            <QrCode size={16} aria-hidden="true" />
            {pendingAction === "create" ? "Criando..." : "Gerar QR code"}
          </button>
        </form>
      ) : null}

      {notice ? (
        <div
          className={`feedback-banner ${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          <span>{notice.message}</span>
        </div>
      ) : null}

      {pendingConnection ? (
        <div className="whatsapp-instance-qr">
          <div>
            <span className="micro-label">Escaneie para conectar</span>
            <strong>Abra o WhatsApp no celular e escaneie o codigo</strong>
          </div>
          {pendingConnection.qrCode ? (
            <img
              alt="QR code do WhatsApp"
              src={qrImageSrc(pendingConnection.qrCode)}
            />
          ) : (
            <p className="muted">Aguardando QR code do provedor...</p>
          )}
          <p className="muted">
            Atualizando automaticamente a cada poucos segundos.
          </p>
        </div>
      ) : null}

      {pollTimedOut ? (
        <div className="feedback-banner warn" role="alert">
          <span>
            Nao detectamos a conexao a tempo. Tente novamente ou verifique o
            servidor Uazapi.
          </span>
        </div>
      ) : null}

      <div className="inbound-connection-list">
        {instances.length === 0 ? (
          <div className="inbound-empty-state">
            <QrCode size={20} aria-hidden="true" />
            <div>
              <strong>Nenhuma instancia conectada</strong>
              <p className="muted">
                Crie uma instancia para comecar a receber mensagens como
                Leads.
              </p>
            </div>
          </div>
        ) : (
          instances.map((instance) => {
            const instancePending = pendingAction?.includes(instance.id);
            const isPendingConnection =
              pendingConnection?.instanceId === instance.id;

            return (
              <details className="inbound-connection" key={instance.id}>
                <summary>
                  <div className="inbound-connection-identity">
                    <span
                      className={`status-dot ${instance.status === "active" ? "active" : ""}`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{instance.name}</strong>
                      <span
                        className={`status-chip ${statusTone(instance.status)}`}
                      >
                        {statusLabel(instance.status)}
                      </span>
                    </div>
                  </div>
                </summary>

                {canManage ? (
                  <div className="inbound-connection-body">
                    <div className="inbound-connection-actions">
                      {instance.status !== "active" && !isPendingConnection ? (
                        <button
                          className="button"
                          type="button"
                          disabled={Boolean(instancePending)}
                          onClick={() => void handleRetryQr(instance.id)}
                        >
                          <RefreshCw size={15} aria-hidden="true" />
                          {instancePending
                            ? "Gerando..."
                            : "Mostrar QR code novamente"}
                        </button>
                      ) : null}
                      <button
                        className="button danger"
                        type="button"
                        disabled={Boolean(instancePending)}
                        onClick={() => void handleRemove(instance.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : null}
              </details>
            );
          })
        )}
      </div>
    </section>
  );
}
