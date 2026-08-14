import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSafeAuthRedirect } from "@/lib/auth/authRedirect";
import { db } from "@/lib/instant/db";

interface SignInWithPasswordProps {
  termsAccepted?: boolean;
  redirectTo?: string;
}

type FieldErrors = {
  email?: string;
  code?: string;
  form?: string;
};

export function SignInWithPassword({ termsAccepted = false, redirectTo }: SignInWithPasswordProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!termsAccepted || isLoading) return;
    if (!email.includes("@")) {
      setErrors({ email: t("invalidEmail") });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setSent(true);
    } catch {
      setErrors({ form: t("authFailed") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!termsAccepted || isLoading) return;
    if (!code.trim()) {
      setErrors({ code: t("magicCodeRequired") });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      await navigate({ href: getSafeAuthRedirect(redirectTo) });
    } catch {
      setErrors({ form: t("authFailed") });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={sent ? handleVerify : handleSend} className="space-y-4" noValidate>
      <FieldGroup className="gap-4">
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="auth-email">{t("emailLabel")}</FieldLabel>
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || sent}
            aria-invalid={errors.email ? true : undefined}
            placeholder={t("emailPlaceholder")}
          />
          {errors.email ? <FieldError>{errors.email}</FieldError> : null}
        </Field>
        {sent ? (
          <Field data-invalid={errors.code ? true : undefined}>
            <FieldLabel htmlFor="auth-magic-code">{t("magicCodeLabel")}</FieldLabel>
            <Input
              id="auth-magic-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              aria-invalid={errors.code ? true : undefined}
              placeholder={t("magicCodePlaceholder")}
            />
            {errors.code ? <FieldError>{errors.code}</FieldError> : null}
          </Field>
        ) : null}
      </FieldGroup>

      {sent ? <p className="text-sm text-muted-foreground">{t("magicCodeSent")}</p> : null}

      {errors.form ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.form}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={!termsAccepted || isLoading}>
        {isLoading ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : sent ? (
          t("verifyMagicCode")
        ) : (
          t("sendMagicCode")
        )}
      </Button>

      {sent ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isLoading}
          onClick={() => {
            setSent(false);
            setCode("");
            setErrors({});
          }}
        >
          {t("useDifferentEmail")}
        </Button>
      ) : null}
    </form>
  );
}
