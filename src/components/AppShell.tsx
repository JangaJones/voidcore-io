import type { ReactNode } from "react";
import { getItemIconUrl, getRemoteWowheadIconUrl } from "../lib/wowhead-icons";

interface AppShellProps {
  title: string;
  dataFromDate: string;
  controls: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, dataFromDate, controls, children }: AppShellProps): JSX.Element {
  const appIconUrl = getItemIconUrl("inv_1205_voidforge_fluctuatingvoidcores_cosmicvoid");
  const appIconRemoteFallbackUrl = getRemoteWowheadIconUrl("inv_1205_voidforge_fluctuatingvoidcores_cosmicvoid");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
      <header className="panel-angled flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <img
            src={appIconUrl ?? appIconRemoteFallbackUrl}
            alt=""
            className="h-10 w-10 border border-slate-700/80 object-cover"
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src !== appIconRemoteFallbackUrl) {
                event.currentTarget.src = appIconRemoteFallbackUrl;
              }
            }}
          />
          <div>
            <h1 className="font-display text-xl tracking-wide text-midnight-silver md:text-2xl">{title}</h1>
            <p className="text-sm uppercase tracking-wider text-midnight-muted">
              World of Warcraft: Midnight Season 1
            </p>
          </div>
        </div>
        <div className="badge border-midnight-violet/55 text-midnight-silver">DATA FROM: {dataFromDate}</div>
      </header>

      <section className="panel-angled p-4 md:p-5">{controls}</section>

      <main className="flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}
