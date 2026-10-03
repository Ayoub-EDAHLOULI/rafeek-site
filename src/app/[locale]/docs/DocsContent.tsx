"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AnimatedWords, Reveal, Stagger } from "@/components/motion/Reveal";

export default function DocsPage() {
  const t = useTranslations("docs");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Stagger trigger="mount">
        <AnimatedWords
          text={t("title")}
          className="text-3xl font-semibold tracking-tight text-text"
        />
      </Stagger>

      <div className="mt-10 flex flex-col gap-10">
        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">{t("step1Title")}</h2>
          <p className="mt-2 text-sm text-subtext">
            {t.rich("step1Description", {
              downloadLink: (chunks) => (
                <Link
                  href="/download"
                  className="font-medium text-text hover:text-primary"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Reveal>

        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">{t("step2Title")}</h2>
          <p className="mt-2 text-sm text-subtext">{t("step2Description")}</p>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-subtext">
            <li>{t("step2List1")}</li>
            <li>{t("step2List2")}</li>
            <li>{t("step2List3")}</li>
          </ol>
        </Reveal>

        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">{t("step3Title")}</h2>
          <p className="mt-2 text-sm text-subtext">{t("step3Description")}</p>
        </Reveal>

        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">{t("ragTitle")}</h2>
          <p className="mt-2 text-sm text-subtext">{t("ragDescription")}</p>
        </Reveal>

        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">
            {t("offlineTitle")}
          </h2>
          <p className="mt-2 text-sm text-subtext">
            {t("offlineDescription")}
          </p>
        </Reveal>

        <Reveal as="section" effect="slide">
          <h2 className="text-lg font-medium text-text">{t("moreTitle")}</h2>
          <p className="mt-2 text-sm text-subtext">
            {t("moreDescription")}{" "}
            <a
              href="https://github.com/Ayoub-EDAHLOULI/Rafeeq"
              className="font-medium text-text hover:text-primary"
            >
              {t("readmeLink")}
            </a>
            .
          </p>
        </Reveal>
      </div>
    </div>
  );
}
