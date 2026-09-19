import { ThemeSettings } from "./ThemeSettings";
import { ZoomSettings } from "./ZoomSettings";

export function AppearanceSettings() {
  return (
    <div className="settings-tab-content">
      <ThemeSettings />
      <ZoomSettings />
    </div>
  );
}
