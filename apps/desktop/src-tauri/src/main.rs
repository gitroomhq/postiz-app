// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rand::Rng;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// Store child processes so they can be cleaned up on exit.
// Children are stored as (service_name, CommandChild) pairs to enable
// ordered shutdown: stop orchestrator first (drains work queue), then
// frontend + backend (stop accepting traffic), then temporal last.
struct AppState {
    children: Mutex<Vec<(String, CommandChild)>>,
}

/// Send SIGTERM to `pids`, poll until all exit or `timeout` elapses,
/// then SIGKILL any survivors. Returns the set of PIDs that are still
/// alive after the SIGKILL (should always be empty).
#[cfg(unix)]
fn sigterm_wait_sigkill(label: &str, pids: &[u32], timeout: Duration) {
    if pids.is_empty() {
        return;
    }
    for &pid in pids {
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
        println!("[postiz] SIGTERM → {} (PID {})", label, pid);
    }
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        let any_alive = pids.iter().any(|&pid| {
            std::process::Command::new("kill")
                .args(["-0", &pid.to_string()])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        });
        if !any_alive {
            return;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    // Grace period exhausted — SIGKILL survivors.
    for &pid in pids {
        let _ = std::process::Command::new("kill")
            .args(["-KILL", &pid.to_string()])
            .status();
        eprintln!("[postiz] SIGKILL → {} (PID {}) — did not exit in time", label, pid);
    }
}

/// Ordered graceful shutdown of all tracked child services.
///
/// Shutdown order (best-practice for a multi-service app):
///   1. orchestrator — stop accepting new Temporal work items
///   2. frontend     — stop serving HTTP (users see connection refused)
///   3. backend      — flush in-flight requests, close DB connections
///   4. temporal     — shut down after workers have disconnected
///
/// Each phase sends SIGTERM and waits up to the per-phase grace period
/// before escalating to SIGKILL. CommandChild::kill() (SIGKILL) is
/// called on every child at the end to release Tauri's handle.
///
/// Safe to call multiple times — the Vec is drained on first call.
fn kill_children_gracefully(state: &AppState) {
    let mut children = state.children.lock().unwrap();
    if children.is_empty() {
        return;
    }
    println!(
        "[postiz] Graceful shutdown: {} service(s)…",
        children.len()
    );

    // Ordered shutdown groups: stop dependents before dependencies.
    let shutdown_order: &[(&str, Duration)] = &[
        ("orchestrator", Duration::from_secs(5)),
        ("frontend",     Duration::from_secs(3)),
        ("backend",      Duration::from_secs(8)),
        ("temporal",     Duration::from_secs(3)),
    ];

    #[cfg(unix)]
    for (name, grace) in shutdown_order {
        let pids: Vec<u32> = children
            .iter()
            .filter(|(n, _)| n == name)
            .map(|(_, c)| c.pid())
            .collect();
        sigterm_wait_sigkill(name, &pids, *grace);
    }

    // SIGKILL any remaining survivors via Tauri handle (releases OS resources).
    let count = children.len();
    for (i, (name, child)) in children.drain(..).enumerate() {
        let pid = child.pid();
        match child.kill() {
            Ok(_) => println!(
                "[postiz] Released {}/{} {} (PID {})",
                i + 1, count, name, pid
            ),
            Err(e) => {
                // Process already exited from SIGTERM — that's fine.
                if !e.to_string().contains("process exit") {
                    eprintln!("[postiz] Could not release {} (PID {}): {}", name, pid, e);
                }
            }
        }
    }

    println!("[postiz] Shutdown complete");
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
    /// JWT Secret for authentication (auto-generated if missing)
    jwt_secret: Option<String>,
}

impl ConfigFile {
    /// Load config from file, returning default if file doesn't exist
    fn load() -> Self {
        let config_path = Self::config_path();
        if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(contents) => match toml::from_str::<ConfigFile>(&contents) {
                    Ok(mut config) => {
                        println!("[postiz] Loaded config from {:?}", config_path);
                        // If JWT secret is missing in file, generate it and save back
                        if config.jwt_secret.is_none() {
                            let secret: String = rand::thread_rng()
                                .sample_iter(&rand::distributions::Alphanumeric)
                                .take(32)
                                .map(char::from)
                                .collect();
                            config.jwt_secret = Some(secret);
                            let _ = config.save();
                        }
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
        
        // No config file, create one with a new JWT secret
        let secret: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();
        let config = Self {
            jwt_secret: Some(secret),
            ..Self::default()
        };
        let _ = config.save();
        config
    }

    /// Save config to file
    fn save(&self) -> std::io::Result<()> {
        let config_path = Self::config_path();
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let contents = toml::to_string_pretty(self).unwrap_or_default();
        fs::write(&config_path, contents)
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
#   JWT_SECRET              - JWT Secret for authentication

# Uncomment and modify the following lines to customize:

# backend_port = 3000
# frontend_port = 4200
# temporal_grpc_port = 7233
# temporal_ui_port = 8233
# data_dir = "/custom/path/to/data"
# auto_find_ports = true
# jwt_secret = "your-secure-secret-here"
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
    jwt_secret: String,
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

        fn get_string(env_var: &str, file_value: Option<String>, default: &str) -> String {
            env::var(env_var)
                .ok()
                .or(file_value)
                .unwrap_or_else(|| default.to_string())
        }

        Self {
            backend_port: get_port("POSTIZ_BACKEND_PORT", file_config.backend_port, 3000),
            frontend_port: get_port("POSTIZ_FRONTEND_PORT", file_config.frontend_port, 4200),
            temporal_grpc_port: get_port("POSTIZ_TEMPORAL_PORT", file_config.temporal_grpc_port, 7233),
            temporal_ui_port: get_port("POSTIZ_TEMPORAL_UI_PORT", file_config.temporal_ui_port, 8233),
            data_dir: get_path("POSTIZ_DATA_DIR", file_config.data_dir, get_data_dir()),
            auto_find_ports: get_bool("POSTIZ_AUTO_FIND_PORTS", file_config.auto_find_ports, true),
            jwt_secret: get_string("JWT_SECRET", file_config.jwt_secret, "change-me-postiz-desktop"),
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

// =============================================================================
// Health Check System
// Implements exponential backoff with jitter for robust service startup
// =============================================================================

/// Health checker with exponential backoff and jitter
struct HealthChecker {
    client: Client,
    max_retries: u32,
    base_delay_ms: u64,
    max_delay_ms: u64,
}

impl HealthChecker {
    fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap_or_else(|_| Client::new()),
            max_retries: 120,     // 120 attempts (~180 seconds max)
            base_delay_ms: 500,   // Start at 500ms
            max_delay_ms: 3000,   // Cap at 3 seconds
        }
    }

    /// Calculate delay with exponential backoff and jitter
    fn calculate_delay(&self, attempt: u32) -> Duration {
        let exp_delay = self.base_delay_ms * 2u64.pow(attempt.min(5)); // Cap exponent at 5
        let capped_delay = exp_delay.min(self.max_delay_ms);
        // Add jitter: ±20% random
        let jitter_factor = 0.8 + (rand::thread_rng().gen::<f64>() * 0.4); // 0.8 to 1.2
        Duration::from_millis((capped_delay as f64 * jitter_factor) as u64)
    }

    /// Wait for an HTTP endpoint to become available
    fn wait_for_http(&self, url: &str, service_name: &str) -> Result<(), String> {
        let start = Instant::now();

        println!("[{}] Health check starting for {}", service_name, url);

        for attempt in 0..self.max_retries {
            match self.client.get(url).send() {
                Ok(resp) if resp.status().is_success() => {
                    println!(
                        "[{}] Ready after {:.1}s (attempt {})",
                        service_name,
                        start.elapsed().as_secs_f64(),
                        attempt + 1
                    );
                    return Ok(());
                }
                Ok(resp) => {
                    println!(
                        "[{}] Received status {} from {} (attempt {})",
                        service_name,
                        resp.status(),
                        url,
                        attempt + 1
                    );
                }
                Err(e) => {
                    if attempt % 5 == 0 {
                        println!(
                            "[{}] Error connecting to {}: {} (attempt {})",
                            service_name,
                            url,
                            e,
                            attempt + 1
                        );
                    }
                }
            }

            std::thread::sleep(self.calculate_delay(attempt));
        }

        Err(format!(
            "{} failed to become ready at {} after {:.0}s",
            service_name,
            url,
            start.elapsed().as_secs_f64()
        ))
    }
}

/// Wait for all services to be healthy with proper ordering
fn wait_for_services_healthy(ports: &PortConfig) -> Result<(), String> {
    let checker = HealthChecker::new();

    // Phase 1: Wait for Temporal (independent, starts fastest)
    println!("[postiz] Waiting for Temporal...");
    checker.wait_for_http(
        &format!("http://localhost:{}/", ports.temporal_ui),
        "temporal",
    )?;

    // Phase 2: Wait for Backend (needs PGlite init, usually slowest)
    // Uses /monitor/health which returns {healthy: bool, services: {...}, timestamp}
    println!("[postiz] Waiting for Backend...");
    checker.wait_for_http(
        &format!("http://localhost:{}/monitor/health", ports.backend),
        "backend",
    )?;

    // Phase 3: Wait for Frontend (fast after build)
    println!("[postiz] Waiting for Frontend...");
    checker.wait_for_http(&format!("http://localhost:{}/", ports.frontend), "frontend")?;

    // Note: Orchestrator has no HTTP endpoint - it connects to Temporal
    // If Temporal and Backend are healthy, Orchestrator should be fine

    println!("[postiz] All services ready!");
    Ok(())
}

/// Generate the loading screen HTML
fn get_loading_html() -> &'static str {
    r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Starting Postiz</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .status {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 16px;
        }
        .hint {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Starting Postiz</h1>
        <div class="spinner"></div>
        <p class="status">Initializing services...</p>
        <p class="hint">This may take a moment on first launch</p>
    </div>
</body>
</html>"#
}

/// Generate error HTML for display when services fail to start
fn get_error_html(error: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Postiz - Startup Error</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            background: #1a1a2e;
            color: #eee;
        }}
        h1 {{
            color: #ff6b6b;
            margin-bottom: 20px;
        }}
        pre {{
            background: #16213e;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
        }}
        .help {{
            margin-top: 30px;
            padding: 20px;
            background: #0f3460;
            border-radius: 8px;
        }}
        .help h2 {{
            color: #94b8ff;
            margin-bottom: 12px;
            font-size: 16px;
        }}
        .help ul {{
            margin-left: 20px;
        }}
        .help li {{
            margin: 8px 0;
        }}
    </style>
</head>
<body>
    <h1>Failed to Start Services</h1>
    <pre>{}</pre>
    <div class="help">
        <h2>Troubleshooting</h2>
        <ul>
            <li>Quit fully and relaunch — Postiz cleans up stale lock files on startup, which often allows the database to recover</li>
            <li>Verify no other instance of Postiz is running</li>
            <li>Check Console.app (macOS) or logs for detailed error messages</li>
            <li>If the issue persists, check port availability (3000, 4200, 7233, 8233)</li>
            <li><strong>Last resort only (destroys all data):</strong> delete ~/Library/Application Support/Postiz/pglite-data and relaunch</li>
        </ul>
    </div>
</body>
</html>"#,
        html_escape(error)
    )
}

/// Escape HTML special characters
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
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
    // 1. Check for bundled resources first (production)
    let base = app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    let bundled_path = base.join("resources");
    if bundled_path.exists() {
        return bundled_path;
    }

    // 2. Fallback for development: look for resources directory relative to executable
    // During cargo run, we are in apps/desktop/src-tauri/target/debug/
    // We want apps/desktop/src-tauri/resources/
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Try target/debug/resources/
            let dev_resources = exe_dir.join("resources");
            if dev_resources.exists() {
                return dev_resources;
            }
            
            // Try apps/desktop/src-tauri/resources/
            if let Some(src_tauri) = exe_dir.parent().and_then(|p| p.parent()) {
                let src_tauri_resources = src_tauri.join("resources");
                if src_tauri_resources.exists() {
                    return src_tauri_resources;
                }
            }
        }
    }
    
    // 3. Last resort: use current directory
    base
}

/// Load user-supplied environment variables from `{data_dir}/postiz.env`.
///
/// This file mirrors the `.env` used by self-hosted web deployments. Users
/// place their social platform API credentials here so the backend sidecar
/// can authenticate with OAuth providers (Twitter/X, Google, LinkedIn, etc.).
///
/// Format: one `KEY=VALUE` per line; lines starting with `#` are comments.
/// Values may optionally be surrounded by single or double quotes.
///
/// Example `~/Library/Application Support/Postiz/postiz.env`:
///   # Twitter / X credentials (from developer.twitter.com)
///   X_API_KEY=your_api_key
///   X_API_SECRET=your_api_secret
///   # Google credentials (from console.cloud.google.com)
///   GOOGLE_CLIENT_ID=your_client_id
///   GOOGLE_CLIENT_SECRET=your_client_secret
///
/// All vars in this file are forwarded to the backend and orchestrator
/// sidecars as environment variables. Keys already set by the launcher
/// (DATABASE_URL, JWT_SECRET, etc.) are NOT overridden by this file.
fn load_env_file(data_dir: &std::path::Path) -> HashMap<String, String> {
    let mut vars = HashMap::new();
    let env_path = data_dir.join("postiz.env");
    if !env_path.exists() {
        return vars;
    }
    match fs::read_to_string(&env_path) {
        Ok(contents) => {
            for line in contents.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some(eq_pos) = line.find('=') {
                    let key = line[..eq_pos].trim().to_string();
                    let raw = line[eq_pos + 1..].trim();
                    // Strip optional surrounding quotes
                    let value = if (raw.starts_with('"') && raw.ends_with('"'))
                        || (raw.starts_with('\'') && raw.ends_with('\''))
                    {
                        raw[1..raw.len() - 1].to_string()
                    } else {
                        raw.to_string()
                    };
                    if !key.is_empty() {
                        vars.insert(key, value);
                    }
                }
            }
            println!("[postiz] Loaded {} env var(s) from {:?}", vars.len(), env_path);
        }
        Err(e) => {
            eprintln!("[postiz] Warning: could not read {:?}: {}", env_path, e);
        }
    }
    vars
}

fn main() {
    let app = tauri::Builder::default()
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

            // Load user-supplied env vars from postiz.env (social platform credentials, etc.)
            // These are forwarded to backend + orchestrator sidecars but do NOT override
            // the infrastructure vars set explicitly below (DATABASE_URL, JWT_SECRET, etc.).
            let user_env = load_env_file(data_dir);

            let pglite_dir = data_dir.join("pglite-data");
            fs::create_dir_all(&pglite_dir).ok();
            let uploads_dir = data_dir.join("uploads");
            fs::create_dir_all(&uploads_dir).ok();

            // Detect unclean PGlite shutdown (force-kill / SIGKILL).
            // PGlite is a WASM PostgreSQL that cannot do WAL crash recovery.
            // When killed mid-operation the WAL is incomplete; on next startup the
            // WASM binary calls abort() → RuntimeError: Aborted() → backend never starts.
            //
            // Detection: postmaster.pid OR .s.PGSQL.5432.lock.out present means
            // PostgreSQL did not shut down cleanly (both are removed on clean shutdown).
            //
            // Recovery: wipe the entire pglite-data directory so PGlite starts fresh.
            // Safe here because we verified no other Postiz instance is running above
            // (port-allocation check). Users lose unsaved state but the app starts.
            // Clean up stale PGlite lock files from a previous unclean shutdown
            // (e.g. force-kill, crash, system restart).
            //
            // We remove ONLY the lock/socket files so that PostgreSQL (PGlite) can
            // attempt WAL crash-recovery on the existing data directory, preserving
            // user accounts. We do NOT wipe the whole pglite-data directory here.
            //
            // If PGlite genuinely cannot recover (it calls abort() → RuntimeError:
            // Aborted()), prisma.service.ts catches the crash, wipes pglite-data,
            // and restarts with a fresh DB automatically.  When that happens the
            // user's stale auth cookie (if any) will cause a 401 on the first
            // protected request; afterRequest() then navigates to /auth/logout which
            // lets Next.js middleware atomically clear the HttpOnly cookie and
            // redirect to /auth/login — so no manual cookie clearing is needed.
            let stale_files = [
                "postmaster.pid",
                ".s.PGSQL.5432",
                ".s.PGSQL.5432.lock",
                ".s.PGSQL.5432.lock.out",
            ];
            let mut cleaned_locks = false;
            for fname in &stale_files {
                let p = pglite_dir.join(fname);
                if p.exists() {
                    match fs::remove_file(&p) {
                        Ok(_) => { cleaned_locks = true; }
                        Err(e) => eprintln!("[postiz] Warning: could not remove {}: {}", fname, e),
                    }
                }
            }
            if cleaned_locks {
                println!("[postiz] Removed stale PGlite lock files — attempting WAL recovery of existing data");
            }

            // Build environment variables with dynamic ports
            let pglite_path = pglite_dir.to_string_lossy().to_string();
            let uploads_path = uploads_dir.to_string_lossy().to_string();
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
            // Sidecar name must match the `name` field in capabilities/default.json,
            // which is "temporal" (Tauri resolves the platform triple automatically).
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

            // ===== PGlite Schema Initialization =====
            // Schema is initialized by prisma.service.ts at backend startup using
            // pre-generated SQL (schema.sql built by build-desktop.ts via prisma migrate diff).
            // prisma db push cannot initialize PGlite because it connects via TCP to
            // postgresql://localhost:5432 — but PGlite is an embedded WASM process with no
            // TCP server. The backend reads PGLITE_SCHEMA_SQL at startup and applies it if
            // the Organization table does not yet exist.
            // Sidecar name must match the `name` field in capabilities/default.json ("node").
            // Tauri resolves the platform triple automatically at runtime.
            let shell = app_handle.shell();
            let pglite_schema_sql = resources_dir.join("backend/prisma/schema.sql");
            let pglite_schema_sql_path = pglite_schema_sql.to_string_lossy().to_string();
            if pglite_schema_sql.exists() {
                println!("[postiz] PGlite schema SQL ready at: {:?}", pglite_schema_sql);
            } else {
                eprintln!("[postiz] Warning: PGlite schema SQL not found at {:?} — schema init will be skipped", pglite_schema_sql);
            }

            // ===== Spawn Backend (Node.js + JS resources) =====
            let backend_dir = resources_dir.join("backend");
            let backend_entry = backend_dir.join("dist/apps/backend/src/main.js");
            println!("[backend] Entry: {:?}", backend_entry);

            let backend_port_str = ports.backend.to_string();
            // Fixed infrastructure vars — these are always set by the launcher and
            // must not be overridden by the user's postiz.env file.
            let fixed_sidecar_keys: &[&str] = &[
                "POSTIZ_MODE", "DATABASE_URL", "PGLITE_DATA_DIR", "PGLITE_SCHEMA_SQL",
                "USE_PGLITE", "JWT_SECRET", "STORAGE_PROVIDER", "UPLOAD_DIRECTORY",
                "TEMPORAL_ADDRESS", "TEMPORAL_NAMESPACE", "DESKTOP_COOKIE_MODE",
                "PORT", "MAIN_URL", "FRONTEND_URL", "NEXT_PUBLIC_BACKEND_URL",
                "BACKEND_URL", "BACKEND_INTERNAL_URL", "IS_GENERAL",
            ];
            let mut backend_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for backend")
                .args([backend_entry.to_str().unwrap_or("")])
                .current_dir(backend_dir.clone())
                .env("POSTIZ_MODE", "desktop")
                .env("DATABASE_URL", &database_url)
                .env("PGLITE_DATA_DIR", &pglite_path)
                .env("PGLITE_SCHEMA_SQL", &pglite_schema_sql_path)
                .env("USE_PGLITE", "true")
                .env("JWT_SECRET", &config.jwt_secret)
                .env("STORAGE_PROVIDER", "local")
                .env("UPLOAD_DIRECTORY", &uploads_path)
                .env("TEMPORAL_ADDRESS", &temporal_address)
                .env("TEMPORAL_NAMESPACE", "default")
                .env("PORT", &backend_port_str)
                .env("MAIN_URL", &backend_url)
                .env("FRONTEND_URL", &frontend_url)
                .env("NEXT_PUBLIC_BACKEND_URL", &backend_url)
                .env("BACKEND_URL", &backend_url)
                .env("BACKEND_INTERNAL_URL", &backend_url)
                // Desktop runs over HTTP (no TLS). WKWebView rejects cookies
                // with Secure flag on http://localhost (WebKit limitation).
                // DESKTOP_COOKIE_MODE tells the backend to use:
                //   { secure: false, httpOnly: true, sameSite: 'lax' }
                // This keeps HttpOnly (XSS protection) and SameSite=Lax
                // (CSRF protection) while dropping Secure (required for HTTP).
                // The backend also sends the JWT in an `auth` response header
                // so Next.js middleware can read it as a fallback.
                .env("DESKTOP_COOKIE_MODE", "true")
                // Required for self-hosted mode: enables multi-user registration,
                // social platform integrations, and routes to /launches tab.
                // All docker-compose self-host configs set this to true.
                .env("IS_GENERAL", "true");
            // Forward user-supplied social platform credentials and any other
            // vars from postiz.env. Skip keys already set above to prevent
            // users accidentally overriding infrastructure configuration.
            for (k, v) in &user_env {
                if !fixed_sidecar_keys.contains(&k.as_str()) {
                    backend_cmd = backend_cmd.env(k, v);
                }
            }

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
                .env("JWT_SECRET", &config.jwt_secret)
                .env("NEXT_PUBLIC_BACKEND_URL", &backend_url)
                .env("BACKEND_URL", &backend_url)
                .env("BACKEND_INTERNAL_URL", &backend_url)
                // Next.js layout reads STORAGE_PROVIDER (server-side, not NEXT_PUBLIC_)
                // to configure the Uppy upload plugin. Without this, storageProvider is
                // undefined at runtime and getUppyUploadPlugin throws "Unsupported storage
                // provider: undefined", crashing the media page with a blank screen.
                .env("STORAGE_PROVIDER", "local")
                // Same flag so the Next.js middleware reads auth from the
                // `auth` response header (sent by backend in DESKTOP_COOKIE_MODE).
                .env("DESKTOP_COOKIE_MODE", "true")
                // Required for self-hosted mode: Next.js server components read this at
                // runtime to set isGeneral=true, enabling social integrations and /launches tab.
                .env("IS_GENERAL", "true");

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
            let mut orchestrator_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for orchestrator")
                .args([orchestrator_entry.to_str().unwrap_or("")])
                .current_dir(orchestrator_dir)
                .env("POSTIZ_MODE", "desktop")
                .env("DATABASE_URL", &database_url)
                .env("PGLITE_DATA_DIR", &pglite_path)
                .env("PGLITE_SCHEMA_SQL", &pglite_schema_sql_path)
                .env("USE_PGLITE", "true")
                .env("JWT_SECRET", &config.jwt_secret)
                .env("STORAGE_PROVIDER", "local")
                .env("UPLOAD_DIRECTORY", &uploads_path)
                .env("TEMPORAL_ADDRESS", &temporal_address)
                .env("TEMPORAL_NAMESPACE", "default")
                .env("BACKEND_URL", &backend_url)
                .env("FRONTEND_URL", &frontend_url)
                .env("IS_GENERAL", "true");
            // Forward user env vars to orchestrator (e.g. social platform webhooks).
            // The orchestrator's fixed_sidecar_keys list differs slightly from the backend
            // (no PORT/MAIN_URL/NEXT_PUBLIC_BACKEND_URL/BACKEND_INTERNAL_URL/DESKTOP_COOKIE_MODE)
            // but sharing the same list is safe — unrecognised keys are simply unused.
            for (k, v) in &user_env {
                if !fixed_sidecar_keys.contains(&k.as_str()) {
                    orchestrator_cmd = orchestrator_cmd.env(k, v);
                }
            }

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

            // Store children for cleanup (named for ordered shutdown).
            let state = app.state::<AppState>();
            let mut children = state.children.lock().unwrap();
            children.push(("temporal".to_string(),     temporal_child));
            children.push(("backend".to_string(),      backend_child));
            children.push(("frontend".to_string(),     frontend_child));
            children.push(("orchestrator".to_string(), orchestrator_child));
            drop(children); // Release lock before potentially blocking

            // Get the main window to show loading/error states
            let window = app.get_webview_window("main");

            // Show loading screen while services start
            if let Some(ref win) = window {
                let loading_url = format!(
                    "data:text/html,{}",
                    urlencoding::encode(get_loading_html())
                );
                if let Ok(url) = tauri::Url::parse(&loading_url) {
                    let _ = win.navigate(url);
                }
            }

            // Clone ports for the health check closure
            let health_ports = PortConfig {
                temporal_grpc: ports.temporal_grpc,
                temporal_ui: ports.temporal_ui,
                backend: ports.backend,
                frontend: ports.frontend,
            };

            // Wait for services to be healthy, then navigate to frontend
            // This is done in a spawn to not block the setup
            if let Some(win) = window {
                let frontend_url_clone = frontend_url.clone();
                tauri::async_runtime::spawn(async move {
                    // Run health checks in a blocking context
                    let result = tauri::async_runtime::spawn_blocking(move || {
                        wait_for_services_healthy(&health_ports)
                    })
                    .await;

                    match result {
                        Ok(Ok(())) => {
                            // Services are ready — navigate to the frontend.
                            // If the user has a stale auth cookie (e.g. from a previous
                            // session whose DB was wiped by prisma.service.ts crash recovery),
                            // the first protected request will get a logout:true response.
                            // afterRequest() in layout.context.tsx then navigates to
                            // /auth/logout which lets Next.js middleware atomically clear the
                            // HttpOnly cookie and redirect to /auth/login.
                            if let Ok(url) = tauri::Url::parse(&frontend_url_clone) {
                                let _ = win.navigate(url);
                            }
                        }
                        Ok(Err(e)) => {
                            // Health check failed
                            eprintln!("[postiz] Service health check failed: {}", e);
                            let error_url = format!(
                                "data:text/html,{}",
                                urlencoding::encode(&get_error_html(&e))
                            );
                            if let Ok(url) = tauri::Url::parse(&error_url) {
                                let _ = win.navigate(url);
                            }
                        }
                        Err(e) => {
                            // spawn_blocking failed
                            eprintln!("[postiz] Health check task failed: {}", e);
                            let error_url = format!(
                                "data:text/html,{}",
                                urlencoding::encode(&get_error_html(&format!("Internal error: {}", e)))
                            );
                            if let Ok(url) = tauri::Url::parse(&error_url) {
                                let _ = win.navigate(url);
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Fires when the user clicks the window close button (red ✕).
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<AppState>();
                kill_children_gracefully(&state);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Register SIGTERM / SIGINT handler so `kill <pid>` and Ctrl-C from a
    // terminal also trigger graceful shutdown instead of orphaning children.
    // ctrlc runs the handler in a dedicated thread (not a raw async-signal
    // handler), so it is safe to call blocking code here.
    {
        let app_handle = app.handle().clone();
        let _ = ctrlc::set_handler(move || {
            println!("[postiz] Received SIGTERM/SIGINT — shutting down");
            let state = app_handle.state::<AppState>();
            kill_children_gracefully(&state);
            std::process::exit(0);
        });
    }

    app.run(|app_handle: &tauri::AppHandle, event| {
        match event {
            // Fires on Cmd+Q, Dock → Quit, and other OS-level quit signals.
            tauri::RunEvent::ExitRequested { .. } => {
                let state = app_handle.state::<AppState>();
                kill_children_gracefully(&state);
            }
            // Belt-and-suspenders: fires after all windows have closed and
            // the event loop is about to return. Children Vec will be empty
            // if ExitRequested already ran, making this a cheap no-op.
            tauri::RunEvent::Exit => {
                let state = app_handle.state::<AppState>();
                kill_children_gracefully(&state);
            }
            _ => {}
        }
    });
}
