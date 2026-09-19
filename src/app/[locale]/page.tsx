import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("home");

  const highlights = [
    { title: t("highlight1Title"), description: t("highlight1Description") },
    { title: t("highlight2Title"), description: t("highlight2Description") },
    { title: t("highlight3Title"), description: t("highlight3Description") },
  ];

  return (
    <div>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <p className="mb-4 text-sm font-medium text-primary">{t("tagline")}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-subtext">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/download"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("downloadCta")}
          </Link>
          <Link
            href="/features"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-input-bg"
          >
            {t("featuresCta")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="font-medium text-text">{item.title}</h3>
              <p className="mt-2 text-sm text-subtext">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-text">
            {t("bannerTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-subtext">
            {t("bannerSubtitle")}
          </p>
        </div>
      </section>
    </div>
  );
}
