
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiBookOpen,
  FiExternalLink,
  FiLoader,
  FiMessageCircle,
  FiSearch,
  FiShield,
} from "react-icons/fi";

import { getSchemes } from "../services/schemes";
import { askAssistant } from "../services/assistant";

import type { Scheme } from "../types/scheme";
import type {
  AssistantAnswer,
  AssistantSource,
} from "../types/assistant";

function OfficialSourceLink({ url }: { url: string | null }) {
  const { t } = useTranslation();

  if (!url) {
    return (
      <span className="assistant-no-link">
        {t("assistantPage.noOfficialLink")}
      </span>
    );
  }

  try {
    const parsedUrl = new URL(url);

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return (
        <span className="assistant-no-link">
          {t("assistantPage.invalidSourceLink")}
        </span>
      );
    }

    return (
      <a
        className="assistant-official-link"
        href={parsedUrl.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("assistantPage.visitSchemeWebsite")} <FiExternalLink />
      </a>
    );
  } catch {
    return (
      <span className="assistant-no-link">
        {t("assistantPage.invalidSourceLink")}
      </span>
    );
  }
}

function SourceCard({ source }: { source: AssistantSource }) {
  const { t } = useTranslation();

  const passageLabel = t(
    source.chunk_indexes.length === 1
      ? "assistantPage.passage"
      : "assistantPage.passages"
  );

  return (
    <article className="assistant-source-card">
      <div className="assistant-source-card-heading">
        <FiBookOpen />

        <div>
          <h4>{source.document_title}</h4>
          <p>{source.scheme_name}</p>
        </div>
      </div>

      <div className="assistant-source-details">
        <span>
          {t("assistantPage.documentId")}: {source.document_id}
        </span>

        <span>
          {t("assistantPage.schemeId")}: {source.scheme_id}
        </span>

        <span>
          {passageLabel}:{" "}
          {source.chunk_indexes
            .map((index) => index + 1)
            .join(", ")}
        </span>
      </div>

      <OfficialSourceLink url={source.official_url} />
    </article>
  );
}

export default function AssistantPage() {
  const { t, i18n } = useTranslation();

  const [question, setQuestion] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [error, setError] = useState("");
  const [schemeLoadError, setSchemeLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSchemes() {
      setLoadingSchemes(true);
      setSchemeLoadError("");

      try {
        const result = await getSchemes();

        if (!cancelled) {
          setSchemes(result);
        }
      } catch (err) {
        if (!cancelled) {
          setSchemeLoadError(
            err instanceof Error
              ? err.message
              : t("assistantPage.unableToLoadSchemes")
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

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length < 3) {
      setError(t("assistantPage.questionTooShort"));
      return;
    }

    setLoading(true);
    setError("");
    setAnswer(null);

    try {
      const currentLanguage = (
        i18n.resolvedLanguage || i18n.language
      ).split("-")[0];

      const supportedLanguages = ["en", "te", "hi", "ta"] as const;

      const language = supportedLanguages.includes(
        currentLanguage as (typeof supportedLanguages)[number]
      )
        ? (currentLanguage as (typeof supportedLanguages)[number])
        : "en";

      const result = await askAssistant({
        question: trimmedQuestion,
        scheme_id: schemeId ? Number(schemeId) : undefined,
        language,
      });

      setAnswer(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("assistantPage.unableToGenerate")
      );
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setQuestion("");
    setAnswer(null);
    setError("");
  }

  return (
    <div className="management-page assistant-page">
      <div className="page-heading">
        <div>
          <h2>{t("assistantPage.title")}</h2>
          <p>{t("assistantPage.description")}</p>
        </div>
      </div>

      <section className="assistant-intro-panel">
        <div className="assistant-intro-icon">
          <FiMessageCircle />
        </div>

        <div>
          <h3>{t("assistantPage.introTitle")}</h3>
          <p>{t("assistantPage.introDescription")}</p>
        </div>
      </section>

      <section className="assistant-search-panel">
        <form onSubmit={handleSubmit}>
          <label
            className="assistant-label"
            htmlFor="assistant-question"
          >
            {t("assistantPage.questionLabel")}
          </label>

          <textarea
            id="assistant-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("assistantPage.questionPlaceholder")}
            rows={4}
            maxLength={2000}
            required
            disabled={loading}
          />

          <div className="assistant-form-bottom">
            <label
              className="assistant-scheme-filter"
              htmlFor="assistant-scheme"
            >
              {t("assistantPage.schemeFilter")}

              <select
                id="assistant-scheme"
                value={schemeId}
                onChange={(event) => setSchemeId(event.target.value)}
                disabled={loading || loadingSchemes}
              >
                <option value="">
                  {t("assistantPage.allSchemes")}
                </option>

                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="scheme-submit-button"
              disabled={loading}
            >
              {loading ? <FiLoader /> : <FiSearch />}

              {loading
                ? t("assistantPage.generating")
                : t("assistantPage.askCivinex")}
            </button>
          </div>
        </form>

        {schemeLoadError && (
          <p className="assistant-inline-warning" role="status">
            {t("assistantPage.schemesLoadError")}: {schemeLoadError}
          </p>
        )}

        {loadingSchemes && (
          <p className="assistant-muted-text">
            {t("assistantPage.loadingSchemes")}
          </p>
        )}
      </section>

      {error && (
        <div className="scheme-form-alert error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <section
          className="assistant-state-panel"
          aria-live="polite"
          aria-busy="true"
        >
          <FiLoader className="assistant-loading-icon" />

          <h3>{t("assistantPage.preparingAnswer")}</h3>
          <p>{t("assistantPage.preparingDescription")}</p>
        </section>
      )}

      {answer && !loading && (
        <section className="assistant-answer-section">
          <div className="assistant-answer-heading">
            <div>
              <h3>{t("assistantPage.answerTitle")}</h3>

              <p>
                <strong>{t("assistantPage.yourQuestion")}</strong>{" "}
                {answer.question}
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={clearConversation}
            >
              {t("assistantPage.askAnother")}
            </button>
          </div>

          <article className="assistant-answer-card">
            <div className="assistant-answer-card-title">
              <FiMessageCircle />
              <span>{t("assistantPage.responseTitle")}</span>
            </div>

            <div className="assistant-answer-text">
              {answer.answer}
            </div>
          </article>

          {!answer.grounded && (
            <div className="assistant-evidence-warning" role="status">
              <FiAlertCircle />

              <p>{t("assistantPage.groundingWarning")}</p>
            </div>
          )}

          <div className="assistant-sources-section">
            <div>
              <h3>{t("assistantPage.sourcesTitle")}</h3>
              <p>{t("assistantPage.sourcesDescription")}</p>
            </div>

            {answer.sources.length === 0 ? (
              <div className="empty-state">
                <FiBookOpen />

                <h3>{t("assistantPage.noSourcesTitle")}</h3>
                <p>{t("assistantPage.noSourcesDescription")}</p>
              </div>
            ) : (
              <div className="assistant-source-list">
                {answer.sources.map((source, index) => (
                  <SourceCard
                    key={`${source.document_id}-${index}`}
                    source={source}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="assistant-disclaimer">
        <FiShield />

        <p>
          <strong>{t("assistantPage.important")}</strong>{" "}
          {t("assistantPage.disclaimer")}
        </p>
      </section>
    </div>
  );
}
