
import { useTranslation } from "react-i18next";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiMessageCircle,
  FiFileText,
  FiExternalLink,
} from "react-icons/fi";

export default function HelpPage() {
  const { t } = useTranslation();

  const helpTopics = [
    {
      title: t("helpPage.findingSchemes"),
      description: t("helpPage.findingSchemesDescription"),
      icon: FiBookOpen,
    },
    {
      title: t("helpPage.eligibilityChecker"),
      description: t("helpPage.eligibilityCheckerDescription"),
      icon: FiCheckCircle,
    },
    {
      title: t("helpPage.aiAssistant"),
      description: t("helpPage.aiAssistantDescription"),
      icon: FiMessageCircle,
    },
    {
      title: t("helpPage.myApplications"),
      description: t("helpPage.myApplicationsDescription"),
      icon: FiClipboard,
    },
    {
      title: t("helpPage.documents"),
      description: t("helpPage.documentsDescription"),
      icon: FiFileText,
    },
  ];

  return (
    <div className="management-page help-page">
      <div className="page-heading">
        <div>
          <h2>{t("helpPage.title")}</h2>
          <p>{t("helpPage.description")}</p>
        </div>
      </div>

      <section className="information-panel">
        <h3>{t("helpPage.welcomeTitle")}</h3>
        <p>{t("helpPage.welcomeDescription")}</p>
      </section>

      <div className="help-topics-grid">
        {helpTopics.map(({ title, description, icon: Icon }) => (
          <article className="help-topic-card" key={title}>
            <div className="help-topic-icon">
              <Icon size={21} />
            </div>

            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <section className="information-panel help-official-note">
        <FiExternalLink size={20} />
        <div>
          <h3>{t("helpPage.officialInfoTitle")}</h3>
          <p>{t("helpPage.officialInfoDescription")}</p>
        </div>
      </section>
    </div>
  );
}
