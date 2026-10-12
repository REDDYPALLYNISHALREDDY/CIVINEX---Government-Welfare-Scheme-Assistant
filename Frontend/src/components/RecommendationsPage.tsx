
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiHelpCircle,
  FiShield,
  FiXCircle,
} from "react-icons/fi";

import { getSchemes } from "../services/schemes";
import { checkEligibility } from "../services/eligibility";

import type { Scheme } from "../types/scheme";
import type {
  CitizenProfile,
  EligibilityCheckResponse,
  EligibilityStatus,
} from "../types/eligibility";

interface Recommendation {
  scheme: Scheme;
  assessment: EligibilityCheckResponse;
}

export default function RecommendationsPage() {
  const { t } = useTranslation();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [age, setAge] = useState("");
  const [state, setState] = useState("");
  const [income, setIncome] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSchemes() {
      setLoadingSchemes(true);
      setError("");

      try {
        const items = await getSchemes();

        if (!cancelled) {
          setSchemes(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("recommendationsPage.unableToLoadSchemes")
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSchemes(false);
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
    setRecommendations([]);
    setHasChecked(false);

    const profile: CitizenProfile = {};

    if (age.trim()) profile.age = Number(age);
    if (state.trim()) profile.state = state.trim();
    if (income.trim()) profile.annual_income = Number(income);

    if (Object.keys(profile).length === 0) {
      setError(t("recommendationsPage.enterProfileDetail"));
      return;
    }

    if (schemes.length === 0) {
      setError(t("recommendationsPage.noSchemesToAssess"));
      return;
    }

    setChecking(true);

    try {
      const results = await Promise.all(
        schemes.map(async (scheme) => {
          try {
            const assessment = await checkEligibility({
              scheme_id: scheme.id,
              profile,
            });

            return { scheme, assessment };
          } catch {
            return null;
          }
        })
      );

      const successful = results.filter(
        (item): item is Recommendation => item !== null
      );

      setRecommendations(
        successful.sort((a, b) => {
          const priority: Record<EligibilityStatus, number> = {
            potentially_eligible: 0,
            needs_more_information: 1,
            not_eligible: 2,
          };

          return (
            priority[a.assessment.status] -
            priority[b.assessment.status]
          );
        })
      );

      if (successful.length === 0) {
        setError(t("recommendationsPage.noAssessmentsCompleted"));
      }

      setHasChecked(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("recommendationsPage.unableToAssess")
      );
    } finally {
      setChecking(false);
    }
  }

  function resetForm() {
    setAge("");
    setState("");
    setIncome("");
    setRecommendations([]);
    setError("");
    setHasChecked(false);
  }

  const statusInfo: Record<
    EligibilityStatus,
    { label: string; icon: typeof FiCheckCircle; className: string }
  > = {
    potentially_eligible: {
      label: t("recommendationsPage.potentiallyEligible"),
      icon: FiCheckCircle,
      className: "recommendation-potential",
    },
    needs_more_information: {
      label: t("recommendationsPage.moreInformationNeeded"),
      icon: FiHelpCircle,
      className: "recommendation-incomplete",
    },
    not_eligible: {
      label: t("recommendationsPage.notEligible"),
      icon: FiXCircle,
      className: "recommendation-not-eligible",
    },
  };

  return (
    <div className="management-page recommendations-page">
      <div className="page-heading">
        <div>
          <h2>{t("recommendationsPage.title")}</h2>
          <p>{t("recommendationsPage.description")}</p>
        </div>
      </div>

      <section className="recommendation-notice">
        <FiShield />
        <p>{t("recommendationsPage.notice")}</p>
      </section>

      <section className="recommendation-profile-panel">
        <h3>{t("recommendationsPage.aboutYou")}</h3>
        <p>
          {t("recommendationsPage.profileDescription")}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="recommendation-profile-grid">
            <label>
              {t("recommendationsPage.age")}
              <input
                type="number"
                min="0"
                max="120"
                step="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder={t("recommendationsPage.yourAge")}
                disabled={checking}
              />
            </label>

            <label>
              {t("recommendationsPage.state")}
              <input
                type="text"
                maxLength={100}
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder={t("recommendationsPage.statePlaceholder")}
                disabled={checking}
              />
            </label>

            <label>
              {t("recommendationsPage.annualIncome")}
              <input
                type="number"
                min="0"
                step="0.01"
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder={t("recommendationsPage.incomePlaceholder")}
                disabled={checking}
              />
            </label>
          </div>

          <div className="recommendation-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={checking}
            >
              {t("recommendationsPage.reset")}
            </button>

            <button
              type="submit"
              className="scheme-submit-button"
              disabled={
                checking || loadingSchemes || schemes.length === 0
              }
            >
              {checking
                ? t("recommendationsPage.assessing")
                : t("recommendationsPage.findMatches")}

              {!checking && <FiArrowRight />}
            </button>
          </div>
        </form>

        {loadingSchemes && (
          <p>{t("recommendationsPage.loadingSchemes")}</p>
        )}

        {!loadingSchemes && schemes.length === 0 && (
          <p>{t("recommendationsPage.noActiveSchemes")}</p>
        )}
      </section>

      {error && (
        <div className="scheme-form-alert error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {checking && (
        <section className="state-panel" aria-live="polite">
          <p>
            {t("recommendationsPage.evaluatingRules", {
              count: schemes.length,
            })}
          </p>
        </section>
      )}

      {hasChecked && !checking && recommendations.length > 0 && (
        <section className="recommendation-results">
          <div className="results-heading">
            <h3>{t("recommendationsPage.resultsTitle")}</h3>
            <span>
              {t("recommendationsPage.schemesAssessed", {
                count: recommendations.length,
              })}
            </span>
          </div>

          <div className="recommendation-list">
            {recommendations.map(({ scheme, assessment }) => {
              const info = statusInfo[assessment.status];
              const StatusIcon = info.icon;

              return (
                <article
                  className="recommendation-card"
                  key={scheme.id}
                >
                  <div className="recommendation-card-heading">
                    <div className="recommendation-title">
                      <FiBookOpen />

                      <div>
                        <h3>{scheme.name}</h3>
                        <p>
                          {scheme.government_level === "state"
                            ? t("recommendationsPage.stateGovernment")
                            : t("recommendationsPage.centralGovernment")}

                          {scheme.state ? ` · ${scheme.state}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`recommendation-status ${info.className}`}
                    >
                      <StatusIcon />
                      {info.label}
                    </span>
                  </div>

                  <p className="recommendation-description">
                    {scheme.description ||
                      t("recommendationsPage.noDescription")}
                  </p>

                  <h4>{t("recommendationsPage.whyResult")}</h4>

                  <ul>
                    {assessment.reasons.map((reason, index) => (
                      <li key={`${scheme.id}-${index}`}>
                        {reason}
                      </li>
                    ))}
                  </ul>

                  {assessment.missing_fields.length > 0 && (
                    <p className="recommendation-missing">
                      {t("recommendationsPage.missingDetails")}:{" "}
                      {assessment.missing_fields.join(", ")}
                    </p>
                  )}

                  <div className="recommendation-card-footer">
                    {scheme.official_url ? (
                      <a
                        href={scheme.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("recommendationsPage.officialWebsite")}{" "}
                        <FiArrowRight />
                      </a>
                    ) : (
                      <span>
                        {t("recommendationsPage.officialLinkUnavailable")}
                      </span>
                    )}

                    <span className="recommendation-code">
                      {scheme.scheme_code ||
                        `${t("recommendationsPage.schemeNumber")} #${scheme.id}`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <p className="recommendation-disclaimer">
        {t("recommendationsPage.disclaimer")}
      </p>
    </div>
  );
}
