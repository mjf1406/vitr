import { useTranslation } from "react-i18next";

import { SignInWithGoogle } from "@/components/auth/SignInWithGoogle";
import { SignInWithPassword } from "@/components/auth/SignInWithPassword";
import { Checkbox } from "@/components/ui/checkbox";
import { APP_CONFIG } from "@/config/app";

export function LoginTermsCheckbox({
  termsAccepted,
  onTermsAcceptedChange,
}: {
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
}) {
  const { t } = useTranslation("auth");

  return (
    <div className="flex items-start gap-2 pb-2">
      <Checkbox
        id="terms-acceptance"
        checked={termsAccepted}
        onCheckedChange={(checked) => onTermsAcceptedChange(checked === true)}
        className="mt-0.5 bg-background"
      />
      <label
        htmlFor="terms-acceptance"
        className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
      >
        {t("agreePrefix")}{" "}
        <a
          href={APP_CONFIG.privacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {t("privacyPolicy")}
        </a>
        ,{" "}
        <a
          href={APP_CONFIG.termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {t("termsAndConditions")}
        </a>
        , {t("and")}{" "}
        <a
          href={APP_CONFIG.cookieUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {t("cookiePolicy")}
        </a>
        .
      </label>
    </div>
  );
}

export function LoginAuthFields({
  termsAccepted,
  redirectTo,
}: {
  termsAccepted: boolean;
  redirectTo: string | undefined;
  passwordEnabled?: boolean;
}) {
  const { t } = useTranslation("auth");

  return (
    <>
      <SignInWithPassword termsAccepted={termsAccepted} redirectTo={redirectTo} />
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t("orContinueWith")}</span>
        </div>
      </div>
      <SignInWithGoogle termsAccepted={termsAccepted} redirectTo={redirectTo} />
      <p className="text-sm opacity-50">{t("magicCodeNote")}</p>
      <div className="mt-4 border-t pt-4">
        <p className="text-center text-xs text-muted-foreground">
          {t("appFooter")}{" "}
          <a
            href={APP_CONFIG.marketingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {t("learnMore")}
          </a>
          .
        </p>
      </div>
    </>
  );
}
