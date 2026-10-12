
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FiBookOpen, FiLock, FiMail, FiUser } from "react-icons/fi";

import { login, register } from "../services/auth";
import type { User } from "../types/auth";

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "register") {
      if (fullName.trim().length < 2) {
        setError(t("authPage.fullNameError"));
        return;
      }

      if (password.length < 8) {
        setError(t("authPage.passwordLengthError"));
        return;
      }

      if (password !== confirmPassword) {
        setError(t("authPage.passwordMismatchError"));
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "register") {
        await register({
          full_name: fullName.trim(),
          email: normalizedEmail,
          password,
        });

        setMessage(t("authPage.registrationSuccess"));
        setPassword("");
        setConfirmPassword("");
        setMode("login");
      } else {
        const user = await login({
          email: normalizedEmail,
          password,
        });

        onLoginSuccess(user);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("authPage.genericError")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-mark">
          <FiBookOpen size={27} />
        </div>

        <p className="auth-eyebrow">CIVINEX · {t("authPage.brandSubtitle")}</p>

        <h1>
          {mode === "login"
            ? t("authPage.welcomeBack")
            : t("authPage.createAccount")}
        </h1>

        <p className="auth-description">
          {mode === "login"
            ? t("authPage.loginDescription")
            : t("authPage.registerDescription")}
        </p>

        <div className="auth-mode-switch">
          <button
            type="button"
            className={mode === "login" ? "selected" : ""}
            onClick={() => changeMode("login")}
            disabled={loading}
          >
            {t("authPage.signIn")}
          </button>

          <button
            type="button"
            className={mode === "register" ? "selected" : ""}
            onClick={() => changeMode("register")}
            disabled={loading}
          >
            {t("authPage.signUp")}
          </button>
        </div>

        {error && (
          <div className="auth-message auth-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-message auth-success" role="status">
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="auth-field">
              <span>{t("authPage.fullName")}</span>
              <div className="auth-input-wrap">
                <FiUser aria-hidden="true" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("authPage.fullNamePlaceholder")}
                  autoComplete="name"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span>{t("authPage.emailAddress")}</span>
            <div className="auth-input-wrap">
              <FiMail aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("authPage.emailPlaceholder")}
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>{t("authPage.password")}</span>
            <div className="auth-input-wrap">
              <FiLock aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("authPage.passwordPlaceholder")}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                maxLength={128}
                required
              />
            </div>
          </label>

          {mode === "register" && (
            <label className="auth-field">
              <span>{t("authPage.confirmPassword")}</span>
              <div className="auth-input-wrap">
                <FiLock aria-hidden="true" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder={t("authPage.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </label>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? t("authPage.pleaseWait")
              : mode === "login"
                ? t("authPage.loginButton")
                : t("authPage.createAccountButton")}
          </button>
        </form>

        <p className="auth-disclaimer">
          {t("authPage.disclaimer")}
        </p>
      </section>
    </main>
  );
}
