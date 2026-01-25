// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// Store child processes so they can be cleaned up on exit
struct AppState {
    children: Mutex<Vec<CommandChild>>,
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
    // In production, resources are in Contents/Resources/
    // In development, they're in src-tauri/resources/
    app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("resources"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            children: Mutex::new(Vec::new()),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Get resource directory for bundled JS code
            let resources_dir = get_resources_dir(app);
            println!("[postiz] Resources directory: {:?}", resources_dir);

            // Create data directory
            let data_dir = get_data_dir();
            std::fs::create_dir_all(&data_dir).ok();
            let pglite_dir = data_dir.join("pglite-data");
            std::fs::create_dir_all(&pglite_dir).ok();

            // Build environment variables
            let pglite_path = pglite_dir.to_string_lossy().to_string();
            let database_url = format!(
                "postgresql://localhost:5432/postiz?pglite={}",
                urlencoding::encode(&pglite_path)
            );
            let temporal_db = data_dir.join("temporal.db");

            // ===== Spawn Temporal server =====
            let shell = app_handle.shell();
            let temporal_cmd = shell
                .sidecar("temporal")
                .expect("failed to create temporal sidecar")
                .args([
                    "server",
                    "start-dev",
                    "--db-filename",
                    temporal_db.to_str().unwrap_or("temporal.db"),
                    "--port",
                    "7233",
                    "--ui-port",
                    "8233",
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
            let backend_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for backend")
                .args([backend_entry.to_str().unwrap_or("")])
                .current_dir(backend_dir.clone())
                .env("POSTIZ_MODE", "desktop")
                .env("DATABASE_URL", &database_url)
                .env("PGLITE_DATA_DIR", &pglite_path)
                .env("USE_PGLITE", "true")
                .env("TEMPORAL_ADDRESS", "localhost:7233")
                .env("TEMPORAL_NAMESPACE", "default")
                .env("MAIN_URL", "http://localhost:3000")
                .env("FRONTEND_URL", "http://localhost:4200")
                .env("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000")
                .env("BACKEND_INTERNAL_URL", "http://localhost:3000");

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
            let frontend_cmd = shell
                .sidecar("node")
                .expect("failed to create node sidecar for frontend")
                .args([frontend_entry.to_str().unwrap_or("")])
                .current_dir(frontend_dir)
                .env("POSTIZ_MODE", "desktop")
                .env("PORT", "4200")
                .env("HOSTNAME", "localhost")
                .env("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3000");

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
                .env("TEMPORAL_ADDRESS", "localhost:7233")
                .env("TEMPORAL_NAMESPACE", "default");

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
