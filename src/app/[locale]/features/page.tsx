import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "features" });
  return { title: t("title"), description: t("subtitle") };
}

export default function FeaturesPage() {
  const t = useTranslations("features");

  const features = [
    { title: t("chatTitle"), description: t("chatDescription") },
    { title: t("managerTitle"), description: t("managerDescription") },
    { title: t("codeTitle"), description: t("codeDescription") },
    { title: t("docTitle"), description: t("docDescription") },
    { title: t("ragTitle"), description: t("ragDescription") },
    { title: t("sessionTitle"), description: t("sessionDescription") },
    { title: t("offlineTitle"), description: t("offlineDescription") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-2xl text-subtext">{t("subtitle")}</p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="font-medium text-text">{feature.title}</h2>
            <p className="mt-2 text-sm text-subtext">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
