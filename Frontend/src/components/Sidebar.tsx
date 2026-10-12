
import { useTranslation } from "react-i18next";

import {
  FiActivity,
  FiBookOpen,
  FiCheckCircle,
  FiFileText,
  FiGrid,
  FiHelpCircle,
  FiSettings,
  FiMessageCircle,
  FiTarget,
} from "react-icons/fi";

export type PageName =
  | "overview"
  | "schemes"
  | "documents"
  | "assistant"
  | "eligibility"
  | "recommendations"
  | "applications"
  | "help";

interface SidebarProps {
  activePage: PageName;
  onNavigate: (page: PageName) => void;
}

export default function Sidebar({
  activePage,
  onNavigate,
}: SidebarProps) {
  const { t } = useTranslation();

  const navigation: {
    label: string;
    icon: typeof FiGrid;
    page: PageName;
  }[] = [
    { label: t("navigation.dashboard"), icon: FiGrid, page: "overview" },
    { label: t("navigation.schemes"), icon: FiBookOpen, page: "schemes" },
    { label: t("navigation.documents"), icon: FiFileText, page: "documents" },
    { label: t("navigation.assistant", { defaultValue: "AI Assistant" }), icon: FiMessageCircle, page: "assistant" },
    { label: t("navigation.eligibility", { defaultValue: "Eligibility Checker" }), icon: FiCheckCircle, page: "eligibility" },
    { label: t("navigation.recommendations", { defaultValue: "Recommendations" }), icon: FiTarget, page: "recommendations" },
    { label: t("navigation.applications"), icon: FiFileText, page: "applications" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <FiBookOpen size={23} />
        </div>

        <div>
          <h2>CIVINEX</h2>
          <p>{t("app.description")}</p>
        </div>
      </div>

      <div className="nav-section-label">
        {t("sidebar.workspace", { defaultValue: "WORKSPACE" })}
      </div>

      <nav className="navigation" aria-label={t("sidebar.mainNavigation", { defaultValue: "Main navigation" })}>
        {navigation.map(({ label, icon: Icon, page }) => (
          <button
            key={page}
            type="button"
            className={`nav-item ${activePage === page ? "active" : ""}`}
            aria-current={activePage === page ? "page" : undefined}
            onClick={() => onNavigate(page)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="help-card"
          onClick={() => onNavigate("help")}
          aria-label={t("sidebar.openHelp", { defaultValue: "Open Help Centre" })}
        >
          <FiHelpCircle size={21} />

          <div>
            <strong>
              {t("sidebar.needAssistance", { defaultValue: "Need assistance?" })}
            </strong>
            <p>
              {t("sidebar.helpDescription", { defaultValue: "Get help using Civinex." })}
            </p>
            <span className="help-card-link">
              {t("sidebar.helpLink", { defaultValue: "Open Help Centre →" })}
            </span>
          </div>
        </button>

        <div className="sidebar-footer">
          <FiSettings size={17} />
          <span>
            {t("sidebar.governmentAssistant", {
              defaultValue: "Government Welfare Assistant",
            })}
          </span>
        </div>

        <div className="sidebar-footer">
          <FiActivity size={17} />
          <span>
            {t("sidebar.prototype", {
              defaultValue: "Prototype · Development",
            })}
          </span>
        </div>
      </div>
    </aside>
  );
}
