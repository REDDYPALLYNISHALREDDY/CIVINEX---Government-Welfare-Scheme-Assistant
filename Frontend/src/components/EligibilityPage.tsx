
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiHelpCircle,
  FiShield,
  FiXCircle,
} from "react-icons/fi";

import { getSchemes } from "../services/schemes";
import { checkEligibility } from "../services/eligibility";
import type { Scheme } from "../types/scheme";
import type {
  EligibilityCheckResponse,
  EligibilityStatus,
} from "../types/eligibility";

export default function EligibilityPage() {
  const { t } = useTranslation();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemeId, setSchemeId] = useState("");
  const [age, setAge] = useState("");
  const [state, setState] = useState("");
  const [income, setIncome] = useState("");
  const [result, setResult] =
    useState<EligibilityCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schemesLoading, setSchemesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchemes() {
      setSchemesLoading(true);

      try {
        const items = await getSchemes();

        if (!cancelled) {
          setSchemes(items);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("eligibilityPage.unableToLoadSchemes")
          );
        }
      } finally {
        if (!cancelled) {
          setSchemesLoading(false);
        }
      }
    }

    void loadSchemes();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!schemeId) {
      setError(t("eligibilityPage.selectSchemeError"));
      return;
    }

    const profile: {
      age?: number;
      state?: string;
      annual_income?: number;
    } = {};

    if (age.trim() !== "") {
      const parsedAge = Number(age);

      if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        setError(t("eligibilityPage.invalidAge"));
        return;
      }

      profile.age = parsedAge;
    }

    if (state.trim() !== "") {
      profile.state = state.trim();
    }

    if (income.trim() !== "") {
      const parsedIncome = Number(income);

      if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
        setError(t("eligibilityPage.invalidIncome"));
        return;
      }

      profile.annual_income = parsedIncome;
    }

    setLoading(true);

    try {
      const response = await checkEligibility({
        scheme_id: Number(schemeId),
        profile,
      });

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("eligibilityPage.unableToCheck")
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSchemeId("");
    setAge("");
    setState("");
    setIncome("");
    setResult(null);
    setError("");
  }

  const statusDetails: Record<
    EligibilityStatus,
    { label: string; className: string }
  > = {
    potentially_eligible: {
      label: t("eligibilityPage.potentiallyEligible"),
      className: "eligibility-status-success",
    },
    not_eligible: {
      label: t("eligibilityPage.notEligible"),
      className: "eligibility-status-fail",
    },
    needs_more_information: {
      label: t("eligibilityPage.moreInformationRequired"),
      className: "eligibility-status-pending",
    },
  };

  const statusIcons = {
    potentially_eligible: <FiCheckCircle />,
    not_eligible: <FiXCircle />,
    needs_more_information: <FiHelpCircle />,
  };

  return (
    <div className="management-page eligibility-page">
      <div className="page-heading">
        <div>
          <h2>{t("eligibilityPage.title")}</h2>
          <p>{t("eligibilityPage.description")}</p>
        </div>
      </div>

      <div className="eligibility-notice">
        <FiShield />
        <p>{t("eligibilityPage.notice")}</p>
      </div>

      <section className="eligibility-form-panel">
        <h3>{t("eligibilityPage.detailsTitle")}</h3>
        <p className="eligibility-muted">
          {t("eligibilityPage.detailsDescription")}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="eligibility-form-grid">
            <label>
              {t("eligibilityPage.governmentScheme")}
              <select
                value={schemeId}
                onChange={(event) => setSchemeId(event.target.value)}
                required
                disabled={schemesLoading || loading}
              >
                <option value="">
                  {t("eligibilityPage.selectScheme")}
                </option>

                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("eligibilityPage.age")}
              <input
                type="number"
                min="0"
                max="120"
                step="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder={t("eligibilityPage.enterAge")}
                disabled={loading}
              />
            </label>

            <label>
              {t("eligibilityPage.state")}
              <input
                type="text"
                maxLength={100}
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder={t("eligibilityPage.statePlaceholder")}
                disabled={loading}
              />
            </label>

            <label>
              {t("eligibilityPage.annualIncome")}
              <input
                type="number"
                min="0"
                step="0.01"
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder={t("eligibilityPage.enterIncome")}
                disabled={loading}
              />
            </label>
          </div>

          {schemesLoading && (
            <p className="eligibility-muted" role="status">
              {t("eligibilityPage.loadingSchemes")}
            </p>
          )}

          {schemes.length === 0 && !schemesLoading && (
            <p className="eligibility-muted">
              {t("eligibilityPage.noSchemes")}
            </p>
          )}

          <div className="eligibility-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={loading}
            >
              {t("eligibilityPage.reset")}
            </button>

            <button
              type="submit"
              className="scheme-submit-button"
              disabled={
                loading || schemesLoading || schemes.length === 0
              }
            >
              {loading
                ? t("eligibilityPage.checking")
                : t("eligibilityPage.checkEligibility")}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="scheme-form-alert error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <section
          className="eligibility-result-panel"
          aria-live="polite"
        >
          <div className="eligibility-result-heading">
            <div>
              <p className="eligibility-muted">
                {t("eligibilityPage.assessmentFor")}
              </p>
              <h3>{result.scheme_name}</h3>
            </div>

            <span
              className={`eligibility-status ${statusDetails[result.status].className}`}
            >
              {statusIcons[result.status]}
              {statusDetails[result.status].label}
            </span>
          </div>

          <h4>{t("eligibilityPage.assessmentDetails")}</h4>

          <ul className="eligibility-reasons">
            {result.reasons.map((reason, index) => (
              <li key={`${index}-${reason}`}>{reason}</li>
            ))}
          </ul>

          {result.missing_fields.length > 0 && (
            <div className="eligibility-missing">
              <strong>
                {t("eligibilityPage.informationNeeded")}
              </strong>
              <p>{result.missing_fields.join(", ")}</p>
            </div>
          )}

          <div className="eligibility-disclaimer">
            <FiShield />
            <p>{result.disclaimer}</p>
          </div>
        </section>
      )}
    </div>
  );
}
