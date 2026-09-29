#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Inside Snap, the GNOME extension (core24/gnome-46-2404) manages
        // graphics backends, Mesa, and WebKitGTK variables automatically.
        // Never override them when running under SNAP confinement.
        if std::env::var("SNAP").is_err() {
            if std::env::var("GDK_BACKEND").map(|v| v.is_empty()).unwrap_or(true) {
                std::env::set_var("GDK_BACKEND", "x11");
            }
            if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").map(|v| v.is_empty()).unwrap_or(true) {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }
    md_studio_lib::run();
}
