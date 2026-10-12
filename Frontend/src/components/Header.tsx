
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiBell,
  FiGlobe,
  FiLogOut,
  FiSearch,
  FiCheck,
  FiChevronDown,
  FiMoon,
  FiSun,
} from "react-icons/fi";

import type { User } from "../types/auth";
import i18n from "../i18n";

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "civinex_theme";

const languages = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
];

function getSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export default function Header({ user, onLogout }: HeaderProps) {
  const { t } = useTranslation();

  const [theme, setTheme] = useState<Theme>(getSavedTheme);

  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.resolvedLanguage || i18n.language || "en"
  );

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const languagePickerRef = useRef<HTMLDivElement>(null);

  const initials = user.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const currentLanguage =
    languages.find((language) => language.code === selectedLanguage) ??
    languages[0];

  useEffect(() => {
    const handleLanguageChanged = (language: string) => {
      setSelectedLanguage(language);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Keep the theme active for this session if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        languagePickerRef.current &&
        !languagePickerRef.current.contains(event.target as Node)
      ) {
        setLanguageMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLanguageSelect(languageCode: string) {
    try {
      await i18n.changeLanguage(languageCode);
      localStorage.setItem("civinex_language", languageCode);
      setSelectedLanguage(languageCode);
      setLanguageMenuOpen(false);
    } catch {
      // Keep the current language if switching fails.
    }
  }

  function handleThemeToggle() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return (
    <header className="topbar">
      <div className="topbar-search">
        <FiSearch size={18} />
        <span>{t("header.assistantTitle")}</span>
      </div>

      <div className="topbar-actions">
        <div className="language-picker" ref={languagePickerRef}>
          <button
            type="button"
            className="language-label"
            onClick={() => setLanguageMenuOpen((current) => !current)}
            aria-label={t("header.chooseLanguage")}
            aria-haspopup="listbox"
            aria-expanded={languageMenuOpen}
          >
            <FiGlobe size={19} />
            <span>{currentLanguage.label}</span>
            <FiChevronDown
              className={`language-chevron ${
                languageMenuOpen ? "is-open" : ""
              }`}
              size={14}
            />
          </button>

          {languageMenuOpen && (
            <div
              className="language-menu"
              role="listbox"
              aria-label={t("header.availableLanguages")}
            >
              <p className="language-menu-title">
                {t("header.selectLanguage")}
              </p>

              {languages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  role="option"
                  aria-selected={selectedLanguage === language.code}
                  className={`language-option ${
                    selectedLanguage === language.code ? "selected" : ""
                  }`}
                  onClick={() => void handleLanguageSelect(language.code)}
                >
                  <span>{language.nativeLabel}</span>
                  {selectedLanguage === language.code && (
                    <FiCheck size={16} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="icon-button theme-toggle"
          onClick={handleThemeToggle}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
          title={theme === "light" ? "Dark mode" : "Light mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? (
            <FiMoon size={19} />
          ) : (
            <FiSun size={19} />
          )}
        </button>

        <button
          type="button"
          className="icon-button"
          aria-label={t("header.notifications")}
          title={t("header.notificationsLater")}
          disabled
        >
          <FiBell size={19} />
        </button>

        <div className="header-user">
          <div
            className="profile-avatar"
            aria-label={t("header.profileFor", {
              name: user.full_name,
            })}
            title={user.full_name}
          >
            {initials || "U"}
          </div>

          <div className="header-user-details">
            <span className="header-user-name">{user.full_name}</span>
            <span className="header-user-role">
              {user.role === "admin"
                ? t("header.administrator")
                : t("header.citizen")}
            </span>
          </div>

          <button
            type="button"
            className="secondary-button header-logout"
            onClick={onLogout}
            title={t("header.signOut")}
          >
            <FiLogOut size={16} />
            <span>{t("header.logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
