
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiBookmark,
  FiClipboard,
  FiExternalLink,
  FiRefreshCw,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";

import {
  getSavedSchemes,
  removeSavedScheme,
} from "../services/savedSchemes";
import type { SavedScheme } from "../services/savedSchemes";

import { getSchemes } from "../services/schemes";
import type { Scheme } from "../types/scheme";

import {
  createTrackedApplication,
  deleteTrackedApplication,
  getTrackedApplications,
  updateTrackedApplication,
} from "../services/trackedApplications";
import type {
  ApplicationStatus,
  TrackedApplication,
  TrackedApplicationInput,
} from "../services/trackedApplications";

type ApplicationTab = "saved" | "tracking";

const emptyForm: TrackedApplicationInput = {
  scheme_id: 0,
  reference_number: "",
  application_date: "",
  status: "planning",
  notes: "",
};

export default function MyApplicationsPage() {
  const { t } = useTranslation();

  const statuses: { value: ApplicationStatus; label: string }[] = [
    { value: "planning", label: t("myApplications.statusPlanning") },
    { value: "submitted", label: t("myApplications.statusSubmitted") },
    { value: "under_review", label: t("myApplications.statusUnderReview") },
    { value: "approved", label: t("myApplications.statusApproved") },
    { value: "rejected", label: t("myApplications.statusRejected") },
    { value: "withdrawn", label: t("myApplications.statusWithdrawn") },
  ];

  const [activeTab, setActiveTab] = useState<ApplicationTab>("tracking");

  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TrackedApplicationInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [saved, tracked, schemeList] = await Promise.all([
        getSavedSchemes(),
        getTrackedApplications(),
        getSchemes({}),
      ]);

      setSavedSchemes(saved);
      setApplications(tracked);
      setSchemes(schemeList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.unableToLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData, attempt]);

  function updateForm<K extends keyof TrackedApplicationInput>(
    key: K,
    value: TrackedApplicationInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.scheme_id) {
      setError(t("myApplications.selectSchemeError"));
      return;
    }

    setSaving(true);

    try {
      const created = await createTrackedApplication({
        ...form,
        reference_number: form.reference_number?.trim() || null,
        application_date: form.application_date || null,
        notes: form.notes?.trim() || null,
      });

      setApplications((current) => [created, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setMessage(t("myApplications.recordCreated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.createError")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    record: TrackedApplication,
    status: ApplicationStatus
  ) {
    setError("");
    setMessage("");

    try {
      const updated = await updateTrackedApplication(record.id, {
        reference_number: record.reference_number,
        application_date: record.application_date,
        status,
        notes: record.notes,
      });

      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setMessage(t("myApplications.statusUpdated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.updateStatusError")
      );
    }
  }

  async function handleDeleteApplication(id: number) {
    if (!window.confirm(t("myApplications.confirmDelete"))) return;

    setError("");
    setMessage("");
    setDeletingId(id);

    try {
      await deleteTrackedApplication(id);
      setApplications((current) => current.filter((item) => item.id !== id));
      setMessage(t("myApplications.recordDeleted"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.deleteError")
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRemoveSaved(schemeId: number) {
    setError("");
    setMessage("");

    try {
      await removeSavedScheme(schemeId);
      setSavedSchemes((current) =>
        current.filter((item) => item.scheme_id !== schemeId)
      );
      setMessage(t("myApplications.schemeRemoved"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.removeSchemeError")
      );
    }
  }

  function startEditing(record: TrackedApplication) {
    setEditingId(record.id);
    setShowForm(false);
    setForm({
      scheme_id: record.scheme_id,
      reference_number: record.reference_number ?? "",
      application_date: record.application_date ?? "",
      status: record.status,
      notes: record.notes ?? "",
    });
    setError("");
    setMessage("");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await updateTrackedApplication(editingId, {
        reference_number: form.reference_number?.trim() || null,
        application_date: form.application_date || null,
        status: form.status,
        notes: form.notes?.trim() || null,
      });

      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingId(null);
      setForm(emptyForm);
      setMessage(t("myApplications.recordUpdated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("myApplications.updateRecordError")
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  return (
    <div className="management-page applications-page">
      <div className="page-heading">
        <div>
          <h2>{t("myApplications.title")}</h2>
          <p>{t("myApplications.description")}</p>
        </div>
      </div>

      <div className="applications-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tracking"}
          className={
            activeTab === "tracking"
              ? "applications-tab active"
              : "applications-tab"
          }
          onClick={() => setActiveTab("tracking")}
        >
          <FiClipboard /> {t("myApplications.trackingTab")} (
          {applications.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "saved"}
          className={
            activeTab === "saved"
              ? "applications-tab active"
              : "applications-tab"
          }
          onClick={() => setActiveTab("saved")}
        >
          <FiBookmark /> {t("myApplications.savedTab")} (
          {savedSchemes.length})
        </button>
      </div>

      {error && (
        <div className="scheme-form-alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="scheme-form-alert success" role="status">
          {message}
        </div>
      )}

      <div className="results-heading">
        <h3>
          {activeTab === "saved"
            ? t("myApplications.savedHeading")
            : t("myApplications.trackingHeading")}
        </h3>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setAttempt((value) => value + 1)}
          disabled={loading}
        >
          <FiRefreshCw /> {t("myApplications.refresh")}
        </button>
      </div>

      {activeTab === "tracking" && (
        <div className="application-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (showForm || editingId !== null) {
                cancelForm();
              } else {
                setError("");
                setMessage("");
                setForm(emptyForm);
                setShowForm(true);
              }
            }}
          >
            <FiPlus />{" "}
            {showForm || editingId !== null
              ? t("myApplications.cancel")
              : t("myApplications.addRecord")}
          </button>
        </div>
      )}

      {activeTab === "tracking" && (showForm || editingId !== null) && (
        <form
          className="application-form"
          onSubmit={editingId === null ? handleCreate : handleUpdate}
        >
          <h3>
            {editingId === null
              ? t("myApplications.newRecord")
              : t("myApplications.editRecord")}
          </h3>

          {editingId === null ? (
            <label>
              {t("myApplications.scheme")} *
              <select
                value={form.scheme_id || ""}
                onChange={(event) =>
                  updateForm("scheme_id", Number(event.target.value))
                }
                required
              >
                <option value="">
                  {t("myApplications.selectScheme")}
                </option>
                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              {t("myApplications.scheme")}:{" "}
              {schemes.find((scheme) => scheme.id === form.scheme_id)?.name ??
                `#${form.scheme_id}`}
            </p>
          )}

          <label>
            {t("myApplications.referenceNumber")}
            <input
              value={form.reference_number ?? ""}
              onChange={(event) =>
                updateForm("reference_number", event.target.value)
              }
              maxLength={150}
              placeholder={t("myApplications.referencePlaceholder")}
            />
          </label>

          <label>
            {t("myApplications.date")}
            <input
              type="date"
              value={form.application_date ?? ""}
              onChange={(event) =>
                updateForm("application_date", event.target.value)
              }
            />
          </label>

          <label>
            {t("myApplications.recordedStatus")}
            <select
              value={form.status}
              onChange={(event) =>
                updateForm(
                  "status",
                  event.target.value as ApplicationStatus
                )
              }
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("myApplications.notes")}
            <textarea
              value={form.notes ?? ""}
              onChange={(event) => updateForm("notes", event.target.value)}
              maxLength={5000}
              rows={3}
              placeholder={t("myApplications.notesPlaceholder")}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? t("myApplications.saving")
              : editingId === null
                ? t("myApplications.saveRecord")
                : t("myApplications.updateRecord")}
          </button>
        </form>
      )}

      {loading ? (
        <section className="state-panel" aria-live="polite">
          <div className="loading-spinner" />
          <h3>{t("myApplications.loadingRecords")}</h3>
        </section>
      ) : activeTab === "saved" ? (
        savedSchemes.length === 0 ? (
          <section className="applications-empty-state">
            <FiBookmark size={27} />
            <h3>{t("myApplications.noSavedSchemes")}</h3>
            <p>{t("myApplications.noSavedSchemesDescription")}</p>
          </section>
        ) : (
          <div className="scheme-list">
            {savedSchemes.map((scheme) => (
              <article className="scheme-row" key={scheme.id}>
                <div className="scheme-row-content">
                  <h3>{scheme.name}</h3>
                  <p>
                    {scheme.description ||
                      t("myApplications.noDescription")}
                  </p>

                  <div className="scheme-meta">
                    <span>
                      {scheme.government_level === "state"
                        ? t("myApplications.stateGovernment")
                        : t("myApplications.centralGovernment")}
                    </span>
                    {scheme.state && <span>{scheme.state}</span>}
                    {scheme.category && <span>{scheme.category}</span>}
                  </div>

                  {scheme.official_url && (
                    <a
                      href={scheme.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("myApplications.officialSource")}{" "}
                      <FiExternalLink />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleRemoveSaved(scheme.scheme_id)}
                >
                  <FiTrash2 /> {t("myApplications.remove")}
                </button>
              </article>
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <section className="applications-empty-state">
          <FiClipboard size={27} />
          <h3>{t("myApplications.noRecords")}</h3>
          <p>{t("myApplications.noRecordsDescription")}</p>
        </section>
      ) : (
        <div className="scheme-list">
          {applications.map((record) => {
            const scheme = schemes.find(
              (item) => item.id === record.scheme_id
            );

            return (
              <article className="scheme-row" key={record.id}>
                <div className="scheme-row-content">
                  <h3>
                    {scheme?.name ??
                      `${t("myApplications.scheme")} #${record.scheme_id}`}
                  </h3>

                  <div className="scheme-meta">
                    <span>
                      {t("myApplications.status")}:{" "}
                      {statuses.find((item) => item.value === record.status)
                        ?.label ?? record.status}
                    </span>

                    {record.reference_number && (
                      <span>
                        {t("myApplications.referenceNumber")}:{" "}
                        {record.reference_number}
                      </span>
                    )}

                    {record.application_date && (
                      <span>
                        {t("myApplications.date")}: {record.application_date}
                      </span>
                    )}
                  </div>

                  {record.notes && <p>{record.notes}</p>}

                  <p className="applications-note">
                    {t("myApplications.personalRecordNotice")}
                  </p>

                  <label>
                    {t("myApplications.updateStatus")}
                    <select
                      value={record.status}
                      onChange={(event) =>
                        void handleStatusChange(
                          record,
                          event.target.value as ApplicationStatus
                        )
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="scheme-row-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEditing(record)}
                  >
                    {t("myApplications.edit")}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={deletingId === record.id}
                    onClick={() => void handleDeleteApplication(record.id)}
                  >
                    <FiTrash2 />{" "}
                    {deletingId === record.id
                      ? t("myApplications.deleting")
                      : t("myApplications.delete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="applications-note">
        {t("myApplications.disclaimer")}
      </p>
    </div>
  );
}
