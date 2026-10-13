import { useCallback, useEffect, useState } from "react";

import {
  FiBookOpen,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiArrowRight,
  FiPlus,
  FiMessageCircle,
  FiBookmark,
  FiCheck,
  FiTrash2,
} from "react-icons/fi";

import "./App.css";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BackendStatus from "./components/BackendStatus";
import SchemeDetails from "./components/SchemeDetails";
import SchemeForm from "./components/SchemeForm";
import DocumentUploadForm from "./components/DocumentUploadForm";
import MyApplicationsPage from "./components/MyApplicationsPage";
import HelpPage from "./components/HelpPage";
import AuthPage from "./components/AuthPage";

import { discoverSchemes, getSchemes } from "./services/schemes";
import { getDocuments, deleteAllDocuments } from "./services/documents";
import type {
  SchemeDiscoveryResult,
} from "./services/schemes";
import {
  getSavedSchemes,
  saveScheme,
  removeSavedScheme,
} from "./services/savedSchemes";

import {
  AuthError,
  clearAccessToken,
  getAccessToken,
  getCachedUser,
  getCurrentUser,
  logout,
} from "./services/auth";

import type { User } from "./types/auth";
import type { Scheme, SchemeFilters } from "./types/scheme";
import type { SchemeDocument } from "./types/document";

import AssistantPage from "./components/AssistantPage";
import EligibilityPage from "./components/EligibilityPage";
import RecommendationsPage from "./components/RecommendationsPage";
import { useTranslation } from "react-i18next";

type PageName =
  | "overview"
  | "schemes"
  | "documents"
  | "assistant"
  | "eligibility"
  | "recommendations"
  | "applications"
  | "help";


function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="state-panel error-panel" role="alert">
      <h3>{t("common.unableToLoadData")}</h3>
      <p>{message}</p>

      <button
        type="button"
        className="secondary-button"
        onClick={onRetry}
      >
        <FiRefreshCw />
        {t("common.retry")}
      </button>
    </section>
  );
}

function LoadingState({ message }: { message: string }) {
  const { t } = useTranslation();

  return (
    <section className="state-panel" aria-live="polite">
      <div className="loading-spinner" />
      <h3>{message}</h3>
      <p>{t("common.loadingDescription")}</p>
    </section>
  );
}


function Overview({
  onNavigate,
  user,
}: {
  onNavigate: (page: PageName) => void;
  user: User;
}) {
  const { t } = useTranslation();

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h2>{t("overview.title")}</h2>
          <p>{t("overview.description")}</p>
        </div>
      </div>

      {user.role === "admin" && <BackendStatus />}

      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-icon">
            <FiBookOpen />
          </div>

          <h3>{t("overview.governmentSchemes")}</h3>
          <p>{t("overview.schemesDescription")}</p>

          <button
            type="button"
            className="feature-card-button"
            onClick={() => onNavigate("schemes")}
          >
            {t("overview.exploreSchemes")} <FiArrowRight />
          </button>
        </article>

        <article className="feature-card">
          <div className="feature-icon">
            <FiFileText />
          </div>

          <h3>{t("overview.schemeDocuments")}</h3>
          <p>{t("overview.documentsDescription")}</p>

          <button
            type="button"
            className="feature-card-button"
            onClick={() => onNavigate("documents")}
          >
            {t("overview.viewDocuments")} <FiArrowRight />
          </button>
        </article>

        <article className="feature-card">
          <div className="feature-icon">
            <FiMessageCircle />
          </div>

          <h3>{t("overview.assistantTitle")}</h3>
          <p>{t("overview.assistantDescription")}</p>

          <button
            type="button"
            className="feature-card-button"
            onClick={() => onNavigate("assistant")}
          >
            {t("overview.askQuestion")} <FiArrowRight />
          </button>
        </article>
      </div>

      <section className="information-panel">
        <h3>{t("overview.aboutTitle")}</h3>
        <p>{t("overview.aboutDescription")}</p>
        <p className="muted-text">{t("overview.disclaimer")}</p>
      </section>
    </div>
  );
}



function SchemesPage({ user }: { user: User }) {
  const { t } = useTranslation();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [search, setSearch] = useState("");
  const [governmentLevel, setGovernmentLevel] = useState("");
  const [stateName, setStateName] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(
    null
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [schemeCreatedMessage, setSchemeCreatedMessage] = useState("");

  const [savedSchemeIds, setSavedSchemeIds] = useState<Set<number>>(
    new Set()
  );

  const [savingSchemeIds, setSavingSchemeIds] = useState<Set<number>>(
    new Set()
  );

  const [savedSchemeMessage, setSavedSchemeMessage] = useState("");
  const [savedSchemeError, setSavedSchemeError] = useState("");

  const [discoveryQuery, setDiscoveryQuery] = useState("");
const [discoveryResults, setDiscoveryResults] =
  useState<SchemeDiscoveryResult[]>([]);
const [discoveryLoading, setDiscoveryLoading] = useState(false);
const [discoveryError, setDiscoveryError] = useState("");
const [discoverySearched, setDiscoverySearched] = useState(false);

  const isAdmin = user.role === "admin";

  const loadSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: SchemeFilters = {
        search: search.trim() || undefined,
        government_level: governmentLevel || undefined,
        state: stateName.trim() || undefined,
      };

      const result = await getSchemes(filters);
      setSchemes(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("schemesPage.unableToLoad")
      );

      setSchemes([]);
    } finally {
      setLoading(false);
    }
  }, [search, governmentLevel, stateName, t]);

  useEffect(() => {
    void loadSchemes();
  }, [loadSchemes, attempt]);

  async function handleToggleSavedScheme(schemeId: number) {
    setSavedSchemeMessage("");
    setSavedSchemeError("");

    setSavingSchemeIds((current) => {
      const next = new Set(current);
      next.add(schemeId);
      return next;
    });

    try {
      if (savedSchemeIds.has(schemeId)) {
        await removeSavedScheme(schemeId);

        setSavedSchemeIds((current) => {
          const next = new Set(current);
          next.delete(schemeId);
          return next;
        });

        setSavedSchemeMessage(t("schemesPage.removedSuccessfully"));
      } else {
        await saveScheme(schemeId);

        setSavedSchemeIds((current) => {
          const next = new Set(current);
          next.add(schemeId);
          return next;
        });

        setSavedSchemeMessage(t("schemesPage.savedSuccessfully"));
      }
    } catch (err) {
      setSavedSchemeError(
        err instanceof Error
          ? err.message
          : t("schemesPage.unableToUpdateSaved")
      );
    } finally {
      setSavingSchemeIds((current) => {
        const next = new Set(current);
        next.delete(schemeId);
        return next;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSavedSchemes() {
      try {
        const saved = await getSavedSchemes();

        if (!cancelled) {
          setSavedSchemeIds(
            new Set(saved.map((item) => item.scheme_id))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setSavedSchemeError(
            err instanceof Error
              ? err.message
              : t("schemesPage.unableToUpdateSaved")
          );
        }
      }
    }

    void loadSavedSchemes();

    return () => {
      cancelled = true;
    };
  }, [user.id, t]);

  if (selectedSchemeId !== null) {
    return (
      <SchemeDetails
        schemeId={selectedSchemeId}
        onBack={() => setSelectedSchemeId(null)}
      />
    );
  }

  async function handleDiscoverSchemes(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const query = discoveryQuery.trim();

  if (query.length < 3) {
    setDiscoveryError("Enter at least 3 characters.");
    return;
  }

  setDiscoveryLoading(true);
  setDiscoveryError("");
  setDiscoverySearched(true);
  setDiscoveryResults([]);

  try {
    const results = await discoverSchemes(query, {
      state: stateName.trim() || undefined,
      government_level: governmentLevel || undefined,
      limit: 10,
    });

    setDiscoveryResults(results);
  } catch (error) {
    setDiscoveryError(
      error instanceof Error
        ? error.message
        : "Unable to discover schemes. Please try again."
    );
  } finally {
    setDiscoveryLoading(false);
  }
}

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h2>{t("schemesPage.title")}</h2>
          <p>{t("schemesPage.description")}</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="scheme-submit-button"
            onClick={() => {
              setSchemeCreatedMessage("");
              setShowCreateForm((current) => !current);
            }}
          >
            {showCreateForm ? (
              t("schemesPage.closeForm")
            ) : (
              <>
                <FiPlus />
                {t("schemesPage.addScheme")}
              </>
            )}
          </button>
        )}
      </div>

      {schemeCreatedMessage && (
        <div className="scheme-form-alert success" role="status">
          {schemeCreatedMessage}
        </div>
      )}

      {isAdmin && showCreateForm && (
        <SchemeForm
          onCancel={() => setShowCreateForm(false)}
          onCreated={(createdScheme) => {
            setShowCreateForm(false);

            setSchemeCreatedMessage(
              `"${createdScheme.name}" ${t("schemesPage.schemeCreated")}`
            );

            setAttempt((current) => current + 1);
          }}
        />
      )}

      
<section className="information-panel scheme-discovery-panel">
  <h3>Find schemes based on your needs</h3>
  <p>
    Describe your situation or what kind of support you need.
    CIVINEX will search the scheme records available in its database.
  </p>

  <form onSubmit={handleDiscoverSchemes}>
    <label htmlFor="scheme-discovery-query">
      Describe what you are looking for
    </label>

    <textarea
      id="scheme-discovery-query"
      value={discoveryQuery}
      onChange={(event) => setDiscoveryQuery(event.target.value)}
      placeholder="Example: I am a farmer in Andhra Pradesh looking for government support."
      rows={3}
      maxLength={500}
      required
      disabled={discoveryLoading}
    />

    <button
      type="submit"
      className="scheme-submit-button"
      disabled={discoveryLoading}
    >
      <FiSearch />
      {discoveryLoading ? "Finding schemes..." : "Find suitable schemes"}
    </button>
  </form>

  {discoveryError && (
    <p role="alert" className="saved-scheme-error">
      {discoveryError}
    </p>
  )}

  {discoveryLoading && (
    <p role="status">Searching the available scheme records...</p>
  )}

  {discoverySearched && !discoveryLoading && !discoveryError && (
    <div className="scheme-list">
      {discoveryResults.length === 0 ? (
        <p>
          No relevant schemes were found in the current database.
          Try different wording or check whether scheme records exist.
        </p>
      ) : (
        discoveryResults.map(({ scheme, relevance_score }) => (
          <article className="scheme-row" key={scheme.id}>
            <div className="scheme-row-content">
              <h4>{scheme.name}</h4>
              <p>
                {scheme.description || "No description available."}
              </p>

              <div className="scheme-meta">
                <span>
                  {scheme.government_level === "state"
                    ? "State government"
                    : "Central government"}
                </span>
                {scheme.state && <span>{scheme.state}</span>}
                {scheme.category && <span>{scheme.category}</span>}
              </div>

              <p>
                <strong>Database relevance score:</strong>{" "}
                {relevance_score}
              </p>

              {scheme.official_url && (
                <a
                  href={scheme.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit official scheme website
                </a>
              )}
            </div>

            <div className="scheme-row-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setSelectedSchemeId(scheme.id)}
              >
                View details <FiArrowRight />
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  )}

  <p className="muted-text">
    Search relevance is not proof of eligibility. Verify eligibility
    and application requirements using official scheme information.
  </p>
</section>


      <section className="filter-panel">
        <div className="search-field">
          <FiSearch />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("schemesPage.searchPlaceholder")}
            aria-label={t("schemesPage.searchLabel")}
          />
        </div>

        <div className="filter-controls">
          <select
            value={governmentLevel}
            onChange={(event) => setGovernmentLevel(event.target.value)}
            aria-label={t("schemesPage.filterGovernmentLevel")}
          >
            <option value="">
              {t("schemesPage.allGovernmentLevels")}
            </option>
            <option value="central">
              {t("schemesPage.centralGovernment")}
            </option>
            <option value="state">
              {t("schemesPage.stateGovernment")}
            </option>
          </select>

          <input
            type="text"
            value={stateName}
            onChange={(event) => setStateName(event.target.value)}
            placeholder={t("schemesPage.filterByState")}
            aria-label={t("schemesPage.filterByState")}
          />

          <button
            type="button"
            className="secondary-button"
            onClick={() => setAttempt((current) => current + 1)}
            disabled={loading}
          >
            <FiRefreshCw />
            {t("schemesPage.refresh")}
          </button>
        </div>
      </section>

      <div className="results-heading">
        <h3>{t("schemesPage.results")}</h3>

        {!loading && !error && (
          <span>
            {t("schemesPage.schemesFound", { count: schemes.length })}
          </span>
        )}

        {savedSchemeMessage && (
          <p className="saved-scheme-success" role="status">
            {savedSchemeMessage}
          </p>
        )}

        {savedSchemeError && (
          <p className="saved-scheme-error" role="alert">
            {savedSchemeError}
          </p>
        )}
      </div>

      {loading ? (
        <LoadingState message={t("schemesPage.loading")} />
      ) : error ? (
        <ErrorMessage
          message={error}
          onRetry={() => setAttempt((current) => current + 1)}
        />
      ) : schemes.length === 0 ? (
        <section className="empty-state">
          <div className="empty-state-icon">
            <FiBookOpen />
          </div>

          <h3>{t("schemesPage.noSchemes")}</h3>
          <p>{t("schemesPage.noSchemesDescription")}</p>

          {(search || governmentLevel || stateName) && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch("");
                setGovernmentLevel("");
                setStateName("");
              }}
            >
              {t("schemesPage.clearFilters")}
            </button>
          )}
        </section>
      ) : (
        <div className="scheme-list">
          {schemes.map((scheme) => (
            <article className="scheme-row" key={scheme.id}>
              <div className="scheme-row-content">
                <div className="scheme-row-heading">
                  <h3>{scheme.name}</h3>

                  {scheme.scheme_code && (
                    <span className="scheme-code">
                      {scheme.scheme_code}
                    </span>
                  )}
                </div>

                <p>
                  {scheme.description || t("schemesPage.noDescription")}
                </p>

                <div className="scheme-meta">
                  <span>
                    {scheme.government_level === "state"
                      ? t("schemesPage.stateGovernment")
                      : t("schemesPage.centralGovernment")}
                  </span>

                  {scheme.state && <span>{scheme.state}</span>}
                  {scheme.category && <span>{scheme.category}</span>}
                </div>
              </div>

              <div className="scheme-row-actions">
                <button
                  type="button"
                  className="secondary-button save-scheme-button"
                  onClick={() => void handleToggleSavedScheme(scheme.id)}
                  disabled={savingSchemeIds.has(scheme.id)}
                  aria-pressed={savedSchemeIds.has(scheme.id)}
                >
                  {savedSchemeIds.has(scheme.id) ? (
                    <>
                      <FiCheck />
                      {t("schemesPage.saved")}
                    </>
                  ) : (
                    <>
                      <FiBookmark />
                      {t("schemesPage.saveScheme")}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setSelectedSchemeId(scheme.id)}
                >
                  {t("schemesPage.viewDetails")} <FiArrowRight />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}



function DocumentsPage({ user }: { user: User }) {
  const { t } = useTranslation();

  const [documents, setDocuments] = useState<SchemeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleDeleteAllDocuments() {
  if (documents.length === 0 || deleting) return;

  const confirmed = window.confirm(
    `Permanently delete all ${documents.length} documents, their stored PDFs, and associated indexed vectors? This cannot be undone.`
  );

  if (!confirmed) return;

  setDeleting(true);
  setActionMessage("");
  setActionError("");

  try {
    const result = await deleteAllDocuments();

    setActionMessage(
      `Deleted ${result.deleted_documents} document records and ${result.deleted_files} PDF files.` +
        (result.warnings.length
          ? ` Cleanup warnings: ${result.warnings.join(" ")}`
          : "")
    );

    setAttempt((current) => current + 1);
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to delete documents."
    );
  } finally {
    setDeleting(false);
  }
}

  const isAdmin = user.role === "admin";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDocuments();
      setDocuments(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("documentsPage.unableToLoad")
      );

      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments, attempt]);

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h2>{t("documentsPage.title")}</h2>
          <p>{t("documentsPage.description")}</p>
        </div>

        <div className="document-page-actions">
          {isAdmin && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleDeleteAllDocuments()}
              disabled={loading || deleting || documents.length === 0}
            >
              <FiTrash2 />
              {deleting ? "Deleting..." : "Delete All Documents"}
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => setAttempt((current) => current + 1)}
            disabled={loading || deleting}
          >
            <FiRefreshCw />
            {t("documentsPage.refresh")}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="upload-alert upload-alert-success" role="status">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="upload-alert upload-alert-error" role="alert">
          {actionError}
        </div>
      )}

      {isAdmin ? (
        <DocumentUploadForm
          onUploaded={() => setAttempt((current) => current + 1)}
        />
      ) : (
        <p className="muted-text">
          {t("documentsPage.viewPermission")}
        </p>
      )}

      <div className="results-heading">
        <h3>{t("documentsPage.records")}</h3>

        {!loading && !error && (
          <span>
            {t("documentsPage.documentsFound", {
              count: documents.length,
            })}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingState message={t("documentsPage.loading")} />
      ) : error ? (
        <ErrorMessage
          message={error}
          onRetry={() => setAttempt((current) => current + 1)}
        />
      ) : documents.length === 0 ? (
        <section className="empty-state">
          <div className="empty-state-icon">
            <FiFileText />
          </div>

          <h3>{t("documentsPage.noDocuments")}</h3>
          <p>{t("documentsPage.noDocumentsDescription")}</p>
        </section>
      ) : (
        <div className="document-table-wrapper">
          <table className="document-table">
            <thead>
              <tr>
                <th>{t("documentsPage.document")}</th>
                <th>{t("documentsPage.filename")}</th>
                <th>{t("documentsPage.schemeId")}</th>
                <th>{t("documentsPage.status")}</th>
                <th>{t("documentsPage.version")}</th>
                <th>{t("documentsPage.created")}</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.title}</td>
                  <td>{document.original_filename}</td>
                  <td>{document.scheme_id}</td>

                  <td>
                    <span className="document-status">
                      {document.processing_status}
                    </span>
                  </td>

                  <td>{document.document_version || "—"}</td>

                  <td>
                    {document.created_at
                      ? new Date(
                          document.created_at
                        ).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [activePage, setActivePage] = useState<PageName>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
  let cancelled = false;

  async function restoreSession() {
    const token = getAccessToken();

    if (!token) {
      if (!cancelled) {
        setCheckingSession(false);
      }
      return;
    }

    const cachedUser = getCachedUser();

    // Restore the dashboard immediately if a previous session exists.
    if (cachedUser && !cancelled) {
      setUser(cachedUser);
      setCheckingSession(false);
    }

    try {
      const currentUser = await getCurrentUser();

      if (!cancelled) {
        setUser(currentUser);
        setSessionError("");
      }
    } catch (error) {
      if (cancelled) {
        return;
      }

      if (
        error instanceof AuthError &&
        (error.status === 401 || error.status === 403)
      ) {
        clearAccessToken();
        setUser(null);
        setSessionError(
          "Your session has expired. Please sign in again."
        );
      } else if (!cachedUser) {
        setSessionError(
          "Unable to verify your session. Check your connection and try again."
        );
      }
      // For temporary network/server errors, keep the cached session.
    } finally {
      if (!cancelled) {
        setCheckingSession(false);
      }
    }
  }

  void restoreSession();

  return () => {
    cancelled = true;
  };
}, []);

  function handleLoginSuccess(signedInUser: User) {
    setSessionError("");
    setUser(signedInUser);
    setActivePage("overview");
  }

  function handleLogout() {
    logout();
    setUser(null);
    setActivePage("overview");
    setSessionError("");
  }

  function navigateTo(page: PageName) {
    setActivePage(page);
  }

  if (checkingSession) {
    return (
      <div className="auth-page">
        <section className="auth-card state-panel" aria-live="polite">
          <div className="loading-spinner" />
          <h2>Checking your session</h2>
          <p>Please wait while Civinex verifies your sign-in.</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {sessionError && (
          <div className="auth-session-message" role="status">
            {sessionError}
          </div>
        )}

        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
      />

      <main className="main-area">
        <Header user={user} onLogout={handleLogout} />

        <div className="page-content">
          {activePage === "overview" && (
            <Overview onNavigate={navigateTo} user={user} />
          )}

          {activePage === "schemes" && (
            <SchemesPage user={user} />
          )}

          {activePage === "documents" && (
            <DocumentsPage user={user} />
          )}

          {activePage === "assistant" && <AssistantPage />}

          {activePage === "eligibility" && <EligibilityPage />}

          {activePage === "recommendations" && (
            <RecommendationsPage />
          )}

          {activePage === "applications" && <MyApplicationsPage />}

          {activePage === "help" && <HelpPage />}
        </div>

        <footer className="app-footer">
          <p>CIVINEX · Government Welfare Scheme Assistant</p>

          <p>
            An independent project. Verify scheme information with
            official government sources.
          </p>
        </footer>
      </main>
    </div>
  );
}
