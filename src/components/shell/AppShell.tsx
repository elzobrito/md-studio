import type { ReactNode } from 'react';

export interface AppShellProps {
  appBar: ReactNode;
  sidebar: ReactNode;
  centerSurface: ReactNode;
  inspector: ReactNode;
  statusBar: ReactNode;
  theme?: string;
  modals?: ReactNode;
}

/**
 * Top-level AppShell for MD Studio R3.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-I, section 1)
 * Composes a single GlobalAppBar at the top, a 3-column workspace body
 * (Sidebar | Center Surface | Inspector), and a stable StatusBar at the footer.
 */
export function AppShell({
  appBar,
  sidebar,
  centerSurface,
  inspector,
  statusBar,
  theme = 'dark',
  modals,
}: AppShellProps) {
  return (
    <div className={`app-shell theme-${theme}`} role="application" aria-label="MD Studio">
      {appBar}
      <div className="app-workspace-body">
        {sidebar}
        <main className="app-center-surface">
          {centerSurface}
        </main>
        {inspector}
      </div>
      <footer className="app-statusbar-container">
        {statusBar}
      </footer>
      {modals}
    </div>
  );
}
