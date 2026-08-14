/** @format */

import { useTranslation } from "react-i18next";

import logoBig from "/vitr/logo-big.webp";
import logoSmall from "/vitr/logo-small.webp";
import { APP_CONFIG } from "@/config/app";
import { isElectronClassroom } from "@/lib/classroom/classroomSession";
import { isSelfHosted } from "@/lib/selfHosted";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "../ui/image-skeleton";

type ModeBrandMarkProps = {
  size: "sm" | "lg";
  layout?: "horizontal" | "stacked";
  className?: string;
};

/** Icon + deployment label for self-host / Electron (replaces wordmark logo). */
function ModeBrandMark({ size, layout = "horizontal", className }: ModeBrandMarkProps) {
  const { t } = useTranslation("common");
  const label = isElectronClassroom() ? t("logoElectron") : t("logoSelfHosted");
  const iconSize = size === "lg" ? 72 : 40;
  const textClassName = size === "lg" ? "text-3xl" : "text-lg";
  const src = size === "lg" ? logoBig : logoSmall;

  return (
    <span
      className={cn(
        "inline-flex items-center text-foreground",
        layout === "stacked" ? "flex-col gap-2" : "gap-2.5",
        className,
      )}
    >
      <ImageSkeleton
        src={src}
        alt={`${APP_CONFIG.name} Icon`}
        width={iconSize}
        height={iconSize}
        objectFit="contain"
      />
      <span className={cn("font-semibold tracking-tight", textClassName)}>{label}</span>
    </span>
  );
}

export function LogoBig() {
  if (isSelfHosted()) {
    return <ModeBrandMark size="lg" />;
  }
  return (
    <ImageSkeleton
      src={logoBig}
      alt={`${APP_CONFIG.name} Logo`}
      width={160}
      height={160}
      objectFit="contain"
    />
  );
}

export function Logo() {
  if (isSelfHosted()) {
    return <ModeBrandMark size="sm" />;
  }
  return (
    <ImageSkeleton
      src={logoSmall}
      alt={`${APP_CONFIG.name} Logo`}
      width={40}
      height={40}
      objectFit="contain"
    />
  );
}

/** Square mark for narrow slots (e.g. footer brand column). */
export function LogoAboveText({ className }: { className?: string } = {}) {
  if (isSelfHosted()) {
    return <ModeBrandMark size="sm" layout="stacked" className={className} />;
  }
  return (
    <ImageSkeleton
      src={logoSmall}
      alt={`${APP_CONFIG.name} Logo`}
      width={56}
      height={56}
      objectFit="contain"
      className={className}
    />
  );
}

export function Icon({ className, large = false }: { className?: string; large?: boolean } = {}) {
  const width = className ? undefined : large ? 96 : 32;
  const height = className ? undefined : large ? 96 : 32;
  return (
    <ImageSkeleton
      src={large ? logoBig : logoSmall}
      alt={`${APP_CONFIG.name} Icon`}
      width={width}
      height={height}
      className={className}
    />
  );
}

export function TextLogo({ className }: { className?: string } = {}) {
  const width = className ? undefined : 40;
  const height = className ? undefined : 40;
  return (
    <ImageSkeleton
      src={logoSmall}
      alt={`${APP_CONFIG.name} Text Logo`}
      width={width}
      height={height}
      className={className}
    />
  );
}

export function LogoXS({ className }: { className?: string } = {}) {
  const width = className ? undefined : 40;
  const height = className ? undefined : 40;
  return (
    <ImageSkeleton
      src={logoSmall}
      alt={`${APP_CONFIG.name} Logo`}
      width={width}
      height={height}
      className={className}
    />
  );
}
