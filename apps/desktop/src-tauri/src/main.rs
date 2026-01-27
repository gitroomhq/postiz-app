// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// Store child processes so they can be cleaned up on exit
struct AppState {
    children: Mutex<Vec<CommandChild>>,
}

// =============================================================================
// Configuration System
// Priority: CLI args > Environment variables > Config file > Default values
// =============================================================================

/// User-configurable settings stored in config file
/// Config file location: ~/Library/Application Support/Postiz/config.toml (macOS)
///                       ~/.config/postiz/config.toml (Linux)
///                       %APPDATA%\Postiz\config.toml (Windows)
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default)]
struct ConfigFile {
    /// Port for the backend API server (default: 3000)
    backend_port: Option<u16>,
    /// Port for the frontend web server (default: 4200)
    frontend_port: Option<u16>,
    /// Port for Temporal gRPC server (default: 7233)
    temporal_grpc_port: Option<u16>,
    /// Port for Temporal UI (default: 8233)
    temporal_ui_port: Option<u16>,
    /// Custom data directory (default: ~/Library/Application Support/Postiz)
    data_dir: Option<String>,
    /// Whether to auto-find available ports if defaults are occupied (default: true)
    auto_find_ports: Option<bool>,
}

impl ConfigFile {
    /// Load config from file, returning default if file doesn't exist
    fn load() -> Self {
        let config_path = Self::config_path();
        if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(contents) => match toml::from_str(&contents) {
                    Ok(config) => {
                        println!("[postiz] Loaded config from {:?}", config_path);
                        return config;
                    }
                    Err(e) => {
                        eprintln!("[postiz] Warning: Failed to parse config file: {}", e);
                    }
                },
                Err(e) => {
                    eprintln!("[postiz] Warning: Failed to read config file: {}", e);
                }
            }
        }
        Self::default()
    }

    /// Get the config file path
    fn config_path() -> PathBuf {
        get_data_dir().join("config.toml")
    }

    /// Create a default config file with comments explaining each option
    #[allow(dead_code)]
    fn create_default_config_file() -> std::io::Result<()> {
        let config_path = Self::config_path();
        if !config_path.exists() {
            let default_config = r#"# Postiz Desktop Configuration
# Configuration priority: CLI args > Environment variables > This file > Defaults
#
# Environment variables:
#   POSTIZ_BACKEND_PORT     - Backend API port (default: 3000)
#   POSTIZ_FRONTEND_PORT    - Frontend web port (default: 4200)
#   POSTIZ_TEMPORAL_PORT    - Temporal gRPC port (default: 7233)
#   POSTIZ_TEMPORAL_UI_PORT - Temporal UI port (default: 8233)
#   POSTIZ_DATA_DIR         - Data directory path
#   POSTIZ_AUTO_FIND_PORTS  - Auto-find available ports (true/false)

# Uncomment and modify the following lines to customize:

# backend_port = 3000
# frontend_port = 4200
# temporal_grpc_port = 7233
# temporal_ui_port = 8233
# data_dir = "/custom/path/to/data"
# auto_find_ports = true
"#;
            if let Some(parent) = config_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(&config_path, default_config)?;
            println!("[postiz] Created default config file at {:?}", config_path);
        }
        Ok(())
    }
}

/// Runtime configuration with resolved values
struct Config {
    backend_port: u16,
    frontend_port: u16,
    temporal_grpc_port: u16,
    temporal_ui_port: u16,
    data_dir: PathBuf,
    auto_find_ports: bool,
}

impl Config {
    /// Load configuration with priority: env vars > config file > defaults
    fn load() -> Self {
        let file_config = ConfigFile::load();

        // Helper to get port from env var or config file or default
        fn get_port(env_var: &str, file_value: Option<u16>, default: u16) -> u16 {
            env::var(env_var)
                .ok()
                .and_then(|s| s.parse().ok())
                .or(file_value)
                .unwrap_or(default)
        }

        fn get_bool(env_var: &str, file_value: Option<bool>, default: bool) -> bool {
            env::var(env_var)
                .ok()
                .map(|s| s.to_lowercase() == "true" || s == "1")
                .or(file_value)
                .unwrap_or(default)
        }

        fn get_path(env_var: &str, file_value: Option<String>, default: PathBuf) -> PathBuf {
            env::var(env_var)
                .ok()
                .map(PathBuf::from)
                .or_else(|| file_value.map(PathBuf::from))
                .unwrap_or(default)
        }

        Self {
            backend_port: get_port("POSTIZ_BACKEND_PORT", file_config.backend_port, 3000),
            frontend_port: get_port("POSTIZ_FRONTEND_PORT", file_config.frontend_port, 4200),
            temporal_grpc_port: get_port("POSTIZ_TEMPORAL_PORT", file_config.temporal_grpc_port, 7233),
            temporal_ui_port: get_port("POSTIZ_TEMPORAL_UI_PORT", file_config.temporal_ui_port, 8233),
            data_dir: get_path("POSTIZ_DATA_DIR", file_config.data_dir, get_data_dir()),
            auto_find_ports: get_bool("POSTIZ_AUTO_FIND_PORTS", file_config.auto_find_ports, true),
        }
    }
}

/// Check if a port is available for binding
fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Find an available port starting from the given port
/// Returns None if no port is available within max_attempts
fn find_available_port(start: u16, max_attempts: u16) -> Option<u16> {
    for offset in 0..max_attempts {
        let port = start + offset;
        if is_port_available(port) {
            return Some(port);
        }
    }
    None
}

/// Port configuration for all services (resolved and validated)
struct PortConfig {
    temporal_grpc: u16,
    temporal_ui: u16,
    backend: u16,
    frontend: u16,
}

impl PortConfig {
    /// Allocate ports based on configuration, with optional auto-find if ports are occupied
    fn from_config(config: &Config) -> Result<Self, String> {
        const MAX_PORT_ATTEMPTS: u16 = 10;

        let (temporal_grpc, temporal_ui, backend, frontend) = if config.auto_find_ports {
            // Auto-find available ports starting from configured values
            let temporal_grpc = find_available_port(config.temporal_grpc_port, MAX_PORT_ATTEMPTS)
                .ok_or_else(|| format!(
                    "Cannot find available port for Temporal gRPC (tried {}-{}). \
                    Set POSTIZ_TEMPORAL_PORT or update config.toml to use a different range.",
                    config.temporal_grpc_port, config.temporal_grpc_port + MAX_PORT_ATTEMPTS - 1
                ))?;

            let temporal_ui = find_available_port(config.temporal_ui_port, MAX_PORT_ATTEMPTS)
                .ok_or_else(|| format!(
                    "Cannot find available port for Temporal UI (tried {}-{}). \
                    Set POSTIZ_TEMPORAL_UI_PORT or update config.toml to use a different range.",
                    config.temporal_ui_port, config.temporal_ui_port + MAX_PORT_ATTEMPTS - 1
                ))?;

            let backend = find_available_port(config.backend_port, MAX_PORT_ATTEMPTS)
                .ok_or_else(|| format!(
                    "Cannot find available port for Backend (tried {}-{}). \
                    Set POSTIZ_BACKEND_PORT or update config.toml to use a different range.",
                    config.backend_port, config.backend_port + MAX_PORT_ATTEMPTS - 1
                ))?;

            let frontend = find_available_port(config.frontend_port, MAX_PORT_ATTEMPTS)
                .ok_or_else(|| format!(
                    "Cannot find available port for Frontend (tried {}-{}). \
                    Set POSTIZ_FRONTEND_PORT or update config.toml to use a different range.",
                    config.frontend_port, config.frontend_port + MAX_PORT_ATTEMPTS - 1
                ))?;

            (temporal_grpc, temporal_ui, backend, frontend)
        } else {
            // Use exact configured ports, fail if not available
            if !is_port_available(config.temporal_grpc_port) {
                return Err(format!(
                    "Port {} for Temporal gRPC is already in use. \
                    Set POSTIZ_TEMPORAL_PORT or enable auto_find_ports in config.toml.",
                    config.temporal_grpc_port
                ));
            }
            if !is_port_available(config.temporal_ui_port) {
                return Err(format!(
                    "Port {} for Temporal UI is already in use. \
                    Set POSTIZ_TEMPORAL_UI_PORT or enable auto_find_ports in config.toml.",
                    config.temporal_ui_port
                ));
            }
            if !is_port_available(config.backend_port) {
                return Err(format!(
                    "Port {} for Backend is already in use. \
                    Set POSTIZ_BACKEND_PORT or enable auto_find_ports in config.toml.",
                    config.backend_port
                ));
            }
            if !is_port_available(config.frontend_port) {
                return Err(format!(
                    "Port {} for Frontend is already in use. \
                    Set POSTIZ_FRONTEND_PORT or enable auto_find_ports in config.toml.",
                    config.frontend_port
                ));
            }

            (config.temporal_grpc_port, config.temporal_ui_port, config.backend_port, config.frontend_port)
        };

        println!("[postiz] Allocated ports - Temporal gRPC: {}, Temporal UI: {}, Backend: {}, Frontend: {}",
            temporal_grpc, temporal_ui, backend, frontend);

        if temporal_grpc != config.temporal_grpc_port || temporal_ui != config.temporal_ui_port
            || backend != config.backend_port || frontend != config.frontend_port {
            println!("[postiz] Note: Some configured ports were occupied, using alternatives");
        }

        Ok(Self {
            temporal_grpc,
            temporal_ui,
            backend,
            frontend,
        })
    }
}

fn get_data_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir()
            .unwrap_or_default()
            .join("Library/Application Support/Postiz")
    }
    #[cfg(target_os = "linux")]
    {
        dirs::home_dir()
            .unwrap_or_default()
            .join(".local/share/postiz")
    }
    #[cfg(target_os = "windows")]
    {
        dirs::data_dir().unwrap_or_default().join("Postiz")
    }
}

/// Get the resources directory for bundled JS code
fn get_resources_dir(app: &tauri::App) -> PathBuf {
    // In production, Tauri puts resources in Contents/Resources/resources/
    // (the extra "resources" is from our tauri.conf.json resources glob)
    // In development, they're in src-tauri/resources/
    let base = app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    // Check if we're in a bundled app (has resources subdirectory)
    let bundled_path = base.join("resources");
    if bundled_path.exists() {
        bundled_path
    } else {
        // Development mode - resources are directly in src-tauri/resources/
        base
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            children: Mutex::new(Vec::new()),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Load configuration (env vars > config file > defaults)
            let config = Config::load();
            println!("[postiz] Configuration loaded - data_dir: {:?}, auto_find_ports: {}",
                config.data_dir, config.auto_find_ports);

            // Allocate ports based on configuration
            let ports = match PortConfig::from_config(&config) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[postiz] ERROR: {}", e);
                    return Err(e.into());
                }
            };

            // Get resource directory for bundled JS code
            let resources_dir = get_resources_dir(app);
            println!("[postiz] Resources directory: {:?}", resources_dir);

            // Create data directory from config
            let data_dir = &config.data_dir;
            fs::create_dir_all(data_dir).ok();
            let pglite_dir = data_dir.join("pglite-data");
            fs::create_dir_all(&pglite_dir).ok();

            // Build environment variables with dynamic ports
            let pglite_path = pglite_dir.to_string_lossy().to_string();
            let database_url = format!(
                "postgresql://localhost:5432/postiz?pglite={}",
                urlencoding::encode(&pglite_path)
            );
            let temporal_db = data_dir.join("temporal.db");

            // Build URL strings for cross-service communication
            let temporal_address = format!("localhost:{}", ports.temporal_grpc);
            let backend_url = format!("http://localhost:{}", ports.backend);
            let frontend_url = format!("http://localhost:{}", ports.frontend);

            // ===== Spawn Temporal server =====
            let shell = app_handle.shell();
            let temporal_port_str = ports.temporal_grpc.to_string();
            let temporal_ui_port_str = ports.temporal_ui.to_string();
            let temporal_cmd = shell
                .sidecar("temporal")
                .expect("failed to create temporal sidecar")
                .args([
                    "server",
                    "start-dev",
                    "--db-filename",
                    temporal_db.to_str().unwrap_or("temporal.db"),
                    "--port",
                    &temporal_port_str,
                    "--ui-port",
                    &temporal_ui_port_str,
                ]);

            let (mut rx, temporal_child) = temporal_cmd.spawn().expect("Failed to spawn temporal");
            println!("[temporal] Started with PID: {:?}", temporal_child.pid());

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[temporal] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[temporal] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            println!("[temporal] Terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            // ===== Spawn Backend (Node.js + JS resources) =====
            let backend_dir = resources_dir.join("backend");
            let backend_entry = backend_dir.join("dist/apps/backend/src/main.js");
            println!("[backend] Entry: {:?}", backend_entry);

            let shell = app_handle.shell();
            let backend_port_str = ports.backend.to_string();
            let backend_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for backend")
                .args([backend_entry.to_str().unwrap_or("")])
                .current_dir(backend_dir.clone())
                .env("POSTIZ_MODE", "desktop")
                .env("DATABASE_URL", &database_url)
                .env("PGLITE_DATA_DIR", &pglite_path)
                .env("USE_PGLITE", "true")
                .env("TEMPORAL_ADDRESS", &temporal_address)
                .env("TEMPORAL_NAMESPACE", "default")
                .env("PORT", &backend_port_str)
                .env("MAIN_URL", &backend_url)
                .env("FRONTEND_URL", &frontend_url)
                .env("NEXT_PUBLIC_BACKEND_URL", &backend_url)
                .env("BACKEND_URL", &backend_url)
                .env("BACKEND_INTERNAL_URL", &backend_url);

            let (mut rx, backend_child) = backend_cmd.spawn().expect("Failed to spawn backend");
            println!("[backend] Started with PID: {:?}", backend_child.pid());

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            println!("[backend] Terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            // ===== Spawn Frontend (Node.js + Next.js standalone) =====
            let frontend_dir = resources_dir.join("frontend/standalone/apps/frontend");
            let frontend_entry = resources_dir.join("frontend/standalone/apps/frontend/server.js");
            println!("[frontend] Entry: {:?}", frontend_entry);

            let shell = app_handle.shell();
            let frontend_port_str = ports.frontend.to_string();
            let frontend_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for frontend")
                .args([frontend_entry.to_str().unwrap_or("")])
                .current_dir(frontend_dir)
                .env("POSTIZ_MODE", "desktop")
                .env("PORT", &frontend_port_str)
                .env("HOSTNAME", "localhost")
                .env("NEXT_PUBLIC_BACKEND_URL", &backend_url)
                .env("BACKEND_URL", &backend_url);

            let (mut rx, frontend_child) = frontend_cmd.spawn().expect("Failed to spawn frontend");
            println!("[frontend] Started with PID: {:?}", frontend_child.pid());

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[frontend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[frontend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            println!("[frontend] Terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            // ===== Spawn Orchestrator (Node.js + Temporal worker) =====
            let orchestrator_dir = resources_dir.join("orchestrator");
            let orchestrator_entry = orchestrator_dir.join("dist/apps/orchestrator/src/main.js");
            println!("[orchestrator] Entry: {:?}", orchestrator_entry);

            let shell = app_handle.shell();
            let orchestrator_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for orchestrator")
                .args([orchestrator_entry.to_str().unwrap_or("")])
                .current_dir(orchestrator_dir)
                .env("POSTIZ_MODE", "desktop")
                .env("DATABASE_URL", &database_url)
                .env("PGLITE_DATA_DIR", &pglite_path)
                .env("USE_PGLITE", "true")
                .env("TEMPORAL_ADDRESS", &temporal_address)
                .env("TEMPORAL_NAMESPACE", "default")
                .env("BACKEND_URL", &backend_url)
                .env("FRONTEND_URL", &frontend_url);

            let (mut rx, orchestrator_child) =
                orchestrator_cmd.spawn().expect("Failed to spawn orchestrator");
            println!(
                "[orchestrator] Started with PID: {:?}",
                orchestrator_child.pid()
            );

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[orchestrator] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[orchestrator] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            println!("[orchestrator] Terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            // Store children for cleanup
            let state = app.state::<AppState>();
            let mut children = state.children.lock().unwrap();
            children.push(temporal_child);
            children.push(backend_child);
            children.push(frontend_child);
            children.push(orchestrator_child);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Clean up child processes
                let state = window.state::<AppState>();
                let mut children = state.children.lock().unwrap();
                for child in children.drain(..) {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
