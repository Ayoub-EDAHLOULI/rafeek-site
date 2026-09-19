import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DocsContent from "./DocsContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "docs" });
  return { title: t("title") };
}

export default function DocsPage() {
  return <DocsContent />;
}
