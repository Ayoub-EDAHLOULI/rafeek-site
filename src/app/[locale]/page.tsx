import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ParticleField from "@/components/ParticleField";
import {
  AnimatedWords,
  Press,
  Stagger,
  StaggerItem,
} from "@/components/motion/Reveal";

export default function HomePage() {
  const t = useTranslations("home");

  const highlights = [
    { title: t("highlight1Title"), description: t("highlight1Description") },
    { title: t("highlight2Title"), description: t("highlight2Description") },
    { title: t("highlight3Title"), description: t("highlight3Description") },
  ];

  return (
    <div>
      <div className="relative isolate overflow-hidden">
        <ParticleField />
        <section
          data-particle-focus
          className="relative mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28"
        >
          <Stagger trigger="mount" interval={0.18}>
            <StaggerItem as="p" className="mb-4 text-sm font-medium text-primary">
              {t("tagline")}
            </StaggerItem>
            <AnimatedWords
              text={t("title")}
              className="text-4xl font-semibold tracking-tight text-text sm:text-5xl"
            />
            <StaggerItem
              as="p"
              className="mx-auto mt-5 max-w-2xl text-lg text-subtext"
            >
              {t("subtitle")}
            </StaggerItem>
            <StaggerItem className="mt-8 flex items-center justify-center gap-3">
              <Press>
                <Link
                  href="/download"
                  className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {t("downloadCta")}
                </Link>
              </Press>
              <Press>
                <Link
                  href="/features"
                  className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-input-bg"
                >
                  {t("featuresCta")}
                </Link>
              </Press>
            </StaggerItem>
          </Stagger>
        </section>

        <section className="relative mx-auto max-w-5xl px-6 pb-24">
          <Stagger className="grid gap-6 sm:grid-cols-3">
            {highlights.map((item) => (
              <StaggerItem
                key={item.title}
                effect="scale"
                hover
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <h3 className="font-medium text-text">{item.title}</h3>
                <p className="mt-2 text-sm text-subtext">{item.description}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      </div>

      <section className="border-t border-border bg-card">
        <Stagger className="mx-auto max-w-5xl px-6 py-20 text-center">
          <StaggerItem
            as="h2"
            effect="focus"
            className="text-2xl font-semibold tracking-tight text-text"
          >
            {t("bannerTitle")}
          </StaggerItem>
          <StaggerItem
            as="p"
            effect="focus"
            className="mx-auto mt-3 max-w-xl text-subtext"
          >
            {t("bannerSubtitle")}
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  );
}
