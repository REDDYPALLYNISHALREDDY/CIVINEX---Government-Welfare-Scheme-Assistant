
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiCheckCircle, FiSave } from "react-icons/fi";

import { createScheme } from "../services/schemes";
import type { Scheme, SchemeCreateInput } from "../types/scheme";

interface SchemeFormProps {
  onCreated: (scheme: Scheme) => void;
  onCancel: () => void;
}

const initialForm = {
  name: "",
  scheme_code: "",
  description: "",
  government_level: "central" as "central" | "state",
  state: "",
  category: "",
  official_url: "",
  eligibility_rules: "{}",
  benefits: "",
};

export default function SchemeForm({
  onCreated,
  onCancel,
}: SchemeFormProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setFieldError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldError("");
    setSuccess("");

    const name = form.name.trim();

    if (name.length < 2) {
      setFieldError(t("schemeForm.nameValidation"));
      return;
    }

    if (form.government_level === "state" && !form.state.trim()) {
      setFieldError(t("schemeForm.stateValidation"));
      return;
    }

    let eligibilityRules: Record<string, unknown>;

    try {
      const parsed: unknown = JSON.parse(form.eligibility_rules);

      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        setFieldError(t("schemeForm.jsonObjectValidation"));
        return;
      }

      eligibilityRules = parsed as Record<string, unknown>;
    } catch {
      setFieldError(t("schemeForm.invalidJsonValidation"));
      return;
    }

    const officialUrl = form.official_url.trim();

    if (officialUrl) {
      try {
        const parsedUrl = new URL(officialUrl);

        if (
          parsedUrl.protocol !== "https:" &&
          parsedUrl.protocol !== "http:"
        ) {
          throw new Error("Unsupported URL protocol");
        }
      } catch {
        setFieldError(t("schemeForm.urlValidation"));
        return;
      }
    }

    const payload: SchemeCreateInput = {
      name,
      scheme_code: form.scheme_code.trim() || null,
      description: form.description.trim() || null,
      government_level: form.government_level,
      state:
        form.government_level === "state" ? form.state.trim() : null,
      category: form.category.trim() || null,
      official_url: officialUrl || null,
      eligibility_rules: eligibilityRules,
      benefits: form.benefits.trim() || null,
    };

    setSaving(true);

    try {
      const created = await createScheme(payload);
      setSuccess(t("schemeForm.createSuccess"));
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("schemeForm.createError")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="scheme-form-panel">
      <div className="scheme-form-heading">
        <div>
          <h2>{t("schemeForm.title")}</h2>
          <p>{t("schemeForm.description")}</p>
        </div>
      </div>

      {error && (
        <div className="scheme-form-alert error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {fieldError && (
        <div className="scheme-form-alert error" role="alert">
          <FiAlertCircle />
          <span>{fieldError}</span>
        </div>
      )}

      {success && (
        <div className="scheme-form-alert success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="scheme-create-form">
        <div className="scheme-form-grid">
          <label className="scheme-field">
            {t("schemeForm.schemeName")} *
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={t("schemeForm.schemeNamePlaceholder")}
              minLength={2}
              maxLength={255}
              required
            />
          </label>

          <label className="scheme-field">
            {t("schemeForm.schemeCode")}
            <input
              value={form.scheme_code}
              onChange={(event) =>
                updateField("scheme_code", event.target.value)
              }
              placeholder={t("schemeForm.schemeCodePlaceholder")}
              maxLength={100}
            />
            <small>{t("schemeForm.schemeCodeHint")}</small>
          </label>

          <label className="scheme-field">
            {t("schemeForm.governmentLevel")} *
            <select
              value={form.government_level}
              onChange={(event) =>
                updateField(
                  "government_level",
                  event.target.value as "central" | "state"
                )
              }
              required
            >
              <option value="central">
                {t("schemeForm.centralGovernment")}
              </option>
              <option value="state">
                {t("schemeForm.stateGovernment")}
              </option>
            </select>
          </label>

          {form.government_level === "state" && (
            <label className="scheme-field">
              {t("schemeForm.state")} *
              <input
                value={form.state}
                onChange={(event) =>
                  updateField("state", event.target.value)
                }
                placeholder={t("schemeForm.statePlaceholder")}
                maxLength={100}
                required
              />
            </label>
          )}

          <label className="scheme-field">
            {t("schemeForm.category")}
            <input
              value={form.category}
              onChange={(event) =>
                updateField("category", event.target.value)
              }
              placeholder={t("schemeForm.categoryPlaceholder")}
              maxLength={100}
            />
          </label>

          <label className="scheme-field">
            {t("schemeForm.officialUrl")}
            <input
              type="url"
              value={form.official_url}
              onChange={(event) =>
                updateField("official_url", event.target.value)
              }
              placeholder="https://..."
            />
          </label>

          <label className="scheme-field full-width">
            {t("schemeForm.schemeDescription")}
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              rows={3}
              placeholder={t("schemeForm.descriptionPlaceholder")}
            />
          </label>

          <label className="scheme-field full-width">
            {t("schemeForm.benefits")}
            <textarea
              value={form.benefits}
              onChange={(event) =>
                updateField("benefits", event.target.value)
              }
              rows={3}
              placeholder={t("schemeForm.benefitsPlaceholder")}
            />
          </label>

          <label className="scheme-field full-width">
            {t("schemeForm.eligibilityRules")}
            <textarea
              value={form.eligibility_rules}
              onChange={(event) =>
                updateField("eligibility_rules", event.target.value)
              }
              rows={6}
              spellCheck={false}
              className="scheme-json-input"
              required
            />
            <small>
              {t("schemeForm.jsonHint")}{" "}
              <code>{"{\"minimum_age\": 18, \"state\": \"Telangana\"}"}</code>.
              {" "}{t("schemeForm.jsonDisclaimer")}
            </small>
          </label>
        </div>

        <div className="scheme-form-actions">
          <button
            type="button"
            className="scheme-cancel-button"
            onClick={onCancel}
            disabled={saving}
          >
            {t("schemeForm.cancel")}
          </button>

          <button
            type="submit"
            className="scheme-submit-button"
            disabled={saving}
          >
            <FiSave />
            {saving
              ? t("schemeForm.saving")
              : t("schemeForm.saveScheme")}
          </button>
        </div>
      </form>
    </section>
  );
}
