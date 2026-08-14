import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createRouter } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme/theme-provider";
import PendingComponent from "@/components/loading/PendingComponent";
import { InnerRouterProvider } from "@/components/routing/InnerRouterProvider";
import i18n, { ensureLocaleLoaded, getInitialLanguage } from "@/i18n";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { polyfillCryptoRandomUUID } from "@/lib/optimistic";
import { installVitePreloadRecovery } from "@/lib/pwa/recoverFromStaleAssets";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { BootstrapOnAuth } from "@/components/auth/BootstrapOnAuth";

import { routeTree } from "./routeTree.gen";
import { TooltipProvider } from "./components/ui/tooltip";
import { RootErrorComponent } from "./components/errors/RootErrorComponent";

polyfillCryptoRandomUUID();
installVitePreloadRecovery();

const router = createRouter({
  routeTree,
  context: {
    auth: {
      isAuthenticated: false,
      isLoading: true,
    },
  },
  defaultPendingComponent: PendingComponent,
  defaultErrorComponent: RootErrorComponent,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

async function bootstrap() {
  const bootLanguage = getInitialLanguage();
  await ensureLocaleLoaded(bootLanguage);
  await i18n.changeLanguage(bootLanguage);

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element #root not found");
  }
  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <LanguageProvider>
          <ThemeProvider defaultTheme="system" storageKey={STORAGE_KEYS.theme}>
            <div vaul-drawer-wrapper="" className="bg-background">
              <TooltipProvider>
                <BootstrapOnAuth />
                <InnerRouterProvider router={router} />
              </TooltipProvider>
              <Toaster />
            </div>
          </ThemeProvider>
        </LanguageProvider>
      </StrictMode>,
    );
  }
}

void bootstrap();
