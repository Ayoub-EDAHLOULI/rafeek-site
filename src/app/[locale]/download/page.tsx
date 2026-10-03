import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import {
  Press,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion/Reveal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "download" });
  return { title: t("title"), description: t("subtitle") };
}

export default function DownloadPage() {
  const t = useTranslations("download");

  const variants = [
    {
      name: t("standardName"),
      size: "~5MB",
      description: t("standardDescription"),
      bestFor: t("standardBestFor"),
      href: "https://github.com/Ayoub-EDAHLOULI/Rafeeq/releases/download/0.1.0/Rafeeq_0.1.0_x64-setup.exe",
    },
    {
      name: t("bundledName"),
      size: "~460MB",
      description: t("bundledDescription"),
      bestFor: t("bundledBestFor"),
      href: "https://github.com/Ayoub-EDAHLOULI/Rafeeq/releases/download/0.1.0/Rafeeq_0.1.0_x64_bundled-setup.exe",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Stagger trigger="mount">
        <StaggerItem
          as="h1"
          effect="scale"
          className="text-3xl font-semibold tracking-tight text-text"
        >
          {t("title")}
        </StaggerItem>
        <StaggerItem as="p" effect="scale" className="mt-3 text-subtext">
          {t("subtitle")}
        </StaggerItem>
      </Stagger>

      <Stagger className="mt-10 flex flex-col gap-4" interval={0.2}>
        {variants.map((variant) => (
          <StaggerItem
            key={variant.name}
            effect="flip"
            hover
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-medium text-text">{variant.name}</h2>
              <span className="shrink-0 text-xs text-subtext">
                {variant.size}
              </span>
            </div>
            <p className="mt-2 text-sm text-subtext">{variant.description}</p>
            <p className="mt-2 text-xs text-subtext">
              <span className="font-medium text-text">{t("bestFor")}</span>{" "}
              {variant.bestFor}
            </p>
            <Press className="mt-4">
              <a
                href={variant.href}
                className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("downloadButton")}
              </a>
            </Press>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal as="p" delay={0.15} className="mt-8 text-sm text-subtext">
        {t("footer")}{" "}
        <a
          href="https://github.com/Ayoub-EDAHLOULI/Rafeeq"
          className="font-medium text-text hover:text-primary"
        >
          GitHub
        </a>
        .
      </Reveal>
    </div>
  );
}
