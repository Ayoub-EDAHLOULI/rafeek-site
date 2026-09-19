import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-8 text-sm text-subtext sm:flex-row sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} Rafeeq. {t("rights")}
        </p>
        <p>
          {t("builtBy")}{" "}
          <a
            href="https://ayoubedahlouli.com"
            className="font-medium text-text hover:text-primary"
          >
            Ayoub Edahlouli
          </a>
        </p>
      </div>
    </footer>
  );
}
