
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiActivity, FiRefreshCw } from "react-icons/fi";

import { getBackendHealth } from "../services/api";
import type { HealthResponse } from "../types/health";

type ConnectionState = "loading" | "connected" | "error";

export default function BackendStatus() {
  const { t } = useTranslation();

  const [state, setState] = useState<ConnectionState>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  const checkConnection = useCallback(async () => {
    setState("loading");
    setError("");

    try {
      const result = await getBackendHealth();

      if (result.status !== "ok") {
        throw new Error(t("backendStatus.healthCheckFailed"));
      }

      setHealth(result);
      setState("connected");
    } catch (err) {
      setHealth(null);
      setState("error");

      setError(
        err instanceof Error
          ? err.message
          : t("backendStatus.connectionFailed")
      );
    }
  }, [t]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return (
    <section className="backend-card">
      <div className="section-heading">
        <div className="section-icon">
          <FiActivity size={20} />
        </div>

        <div>
          <h3>{t("backendStatus.title")}</h3>
          <p>{t("backendStatus.description")}</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => void checkConnection()}
          disabled={state === "loading"}
          aria-label={t("backendStatus.refreshLabel")}
        >
          <FiRefreshCw
            size={17}
            className={state === "loading" ? "spin" : ""}
          />
          <span>{t("backendStatus.refresh")}</span>
        </button>
      </div>

      <div className="connection-result">
        <span className={`status-dot ${state}`} />

        <div className="connection-copy">
          <strong>
            {state === "loading" && t("backendStatus.checking")}
            {state === "connected" && t("backendStatus.connected")}
            {state === "error" && t("backendStatus.unavailable")}
          </strong>

          <p>
            {state === "connected" && health
              ? `${health.service} · v${health.version}`
              : state === "loading"
                ? t("backendStatus.contacting")
                : error}
          </p>
        </div>

        {state === "connected" && (
          <span className="environment-tag">
            {health?.environment}
          </span>
        )}
      </div>

      <div className="endpoint-row">
        <span>{t("backendStatus.endpoint")}</span>
        <code>/api/v1/health</code>
      </div>
    </section>
  );
}
