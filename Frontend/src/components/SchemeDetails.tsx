
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiExternalLink, FiRefreshCw } from "react-icons/fi";

import { getSchemeById } from "../services/schemes";
import type { Scheme } from "../types/scheme";

interface SchemeDetailsProps {
  schemeId: number;
  onBack: () => void;
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableValue(value: unknown, notProvided: string): string {
  if (value === null || value === undefined || value === "") {
    return notProvided;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => readableValue(item, notProvided))
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(
        ([key, item]) =>
          `${formatLabel(key)}: ${readableValue(item, notProvided)}`
      )
      .join("\n");
  }

  return notProvided;
}

export default function SchemeDetails({
  schemeId,
  onBack,
}: SchemeDetailsProps) {
  const { t, i18n } = useTranslation();

  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const notProvided = t("schemeDetails.notProvided");

  useEffect(() => {
    let cancelled = false;

    async function loadScheme() {
      setLoading(true);
      setError(null);
      setScheme(null);

      try {
        const result = await getSchemeById(schemeId);

        if (!cancelled) {
          setScheme(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("schemeDetails.loadError")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadScheme();

    return () => {
      cancelled = true;
    };
  }, [schemeId, attempt, t]);

  if (loading) {
    return (
      <section className="state-panel" aria-live="polite">
        <div className="loading-spinner" />
        <h3>{t("schemeDetails.loadingTitle")}</h3>
        <p>{t("schemeDetails.loadingDescription")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="state-panel error-panel" role="alert">
        <h3>{t("schemeDetails.loadFailureTitle")}</h3>
        <p>{error}</p>

        <div className="state-actions">
          <button
            className="secondary-button"
            onClick={onBack}
            type="button"
          >
            <FiArrowLeft /> {t("schemeDetails.backToSchemes")}
          </button>

          <button
            className="primary-button"
            onClick={() => setAttempt((current) => current + 1)}
            type="button"
          >
            <FiRefreshCw /> {t("schemeDetails.retry")}
          </button>
        </div>
      </section>
    );
  }

  if (!scheme) {
    return (
      <section className="state-panel">
        <h3>{t("schemeDetails.notFoundTitle")}</h3>
        <p>{t("schemeDetails.notFoundDescription")}</p>

        <button
          className="secondary-button"
          onClick={onBack}
          type="button"
        >
          <FiArrowLeft /> {t("schemeDetails.backToSchemes")}
        </button>
      </section>
    );
  }

  const eligibilityEntries = Object.entries(scheme.eligibility_rules ?? {});

  return (
    <section className="scheme-detail-page">
      <button className="back-button" onClick={onBack} type="button">
        <FiArrowLeft /> {t("schemeDetails.backToSchemes")}
      </button>

      <div className="detail-heading">
        <div>
          <span className="section-eyebrow">
            {t("schemeDetails.sectionEyebrow")}
          </span>

          <h2>{scheme.name}</h2>

          {scheme.scheme_code && (
            <p className="scheme-code">
              {t("schemeDetails.schemeCode")}: {scheme.scheme_code}
            </p>
          )}
        </div>

        <span
          className={`status-pill ${
            scheme.is_active ? "status-active" : "status-inactive"
          }`}
        >
          {scheme.is_active
            ? t("schemeDetails.active")
            : t("schemeDetails.inactive")}
        </span>
      </div>

      <div className="detail-grid">
        <article className="detail-card detail-card-wide">
          <h3>{t("schemeDetails.descriptionTitle")}</h3>

          <p className="detail-description">
            {scheme.description || t("schemeDetails.noDescription")}
          </p>
        </article>

        <article className="detail-card">
          <h3>{t("schemeDetails.informationTitle")}</h3>

          <dl className="detail-list">
            <div>
              <dt>{t("schemeDetails.governmentLevel")}</dt>
              <dd>
                {scheme.government_level
                  ? scheme.government_level === "state"
                    ? t("schemeDetails.stateGovernment")
                    : scheme.government_level === "central"
                      ? t("schemeDetails.centralGovernment")
                      : formatLabel(scheme.government_level)
                  : notProvided}
              </dd>
            </div>

            <div>
              <dt>{t("schemeDetails.state")}</dt>
              <dd>
                {scheme.state || t("schemeDetails.allStatesNotSpecified")}
              </dd>
            </div>

            <div>
              <dt>{t("schemeDetails.category")}</dt>
              <dd>{scheme.category || notProvided}</dd>
            </div>

            <div>
              <dt>{t("schemeDetails.lastUpdated")}</dt>
              <dd>
                {scheme.updated_at
                  ? new Date(scheme.updated_at).toLocaleDateString(
                      i18n.resolvedLanguage || i18n.language
                    )
                  : notProvided}
              </dd>
            </div>
          </dl>
        </article>

        <article className="detail-card">
          <h3>{t("schemeDetails.benefitsTitle")}</h3>

          <p className="detail-description">
            {readableValue(scheme.benefits, notProvided)}
          </p>
        </article>

        <article className="detail-card detail-card-wide">
          <h3>{t("schemeDetails.eligibilityTitle")}</h3>

          {eligibilityEntries.length === 0 ? (
            <p className="muted-text">
              {t("schemeDetails.noEligibilityRules")}
            </p>
          ) : (
            <dl className="detail-list">
              {eligibilityEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{formatLabel(key)}</dt>
                  <dd className="preserve-lines">
                    {readableValue(value, notProvided)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </article>

        <article className="detail-card detail-card-wide">
          <h3>{t("schemeDetails.officialSourceTitle")}</h3>

          {scheme.official_url ? (
            <a
              className="official-link"
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("schemeDetails.visitOfficialWebsite")} <FiExternalLink />
            </a>
          ) : (
            <p className="muted-text">
              {t("schemeDetails.noOfficialWebsite")}
            </p>
          )}
        </article>
      </div>

      <p className="verification-note">
        {t("schemeDetails.verificationNotice")}
      </p>
    </section>
  );
}
