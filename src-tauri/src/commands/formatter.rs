use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FormatResult {
    pub formatted: bool,
    pub code: String,
    pub formatter: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FormatterSpec {
    pub binary: String,
    pub args: Vec<String>,
    pub tool_name: String,
}

pub fn get_formatter_spec(language: &str) -> Option<FormatterSpec> {
    let lang = language.to_ascii_lowercase();
    match lang.as_str() {
        "python" | "py" => Some(FormatterSpec {
            binary: "ruff".to_string(),
            args: vec!["format".to_string(), "-".to_string()],
            tool_name: "ruff".to_string(),
        }),
        "rust" | "rs" => Some(FormatterSpec {
            binary: "rustfmt".to_string(),
            args: vec![],
            tool_name: "rustfmt".to_string(),
        }),
        "go" | "golang" => Some(FormatterSpec {
            binary: "gofmt".to_string(),
            args: vec![],
            tool_name: "gofmt".to_string(),
        }),
        "c" | "h" => Some(FormatterSpec {
            binary: "clang-format".to_string(),
            args: vec!["--assume-filename=code.c".to_string()],
            tool_name: "clang-format".to_string(),
        }),
        "cpp" | "cxx" | "cc" | "c++" | "hpp" | "hxx" => Some(FormatterSpec {
            binary: "clang-format".to_string(),
            args: vec!["--assume-filename=code.cpp".to_string()],
            tool_name: "clang-format".to_string(),
        }),
        "csharp" | "cs" => Some(FormatterSpec {
            binary: "clang-format".to_string(),
            args: vec!["--assume-filename=code.cs".to_string()],
            tool_name: "clang-format".to_string(),
        }),
        "java" => {
            if find_executable("google-java-format").is_some() {
                Some(FormatterSpec {
                    binary: "google-java-format".to_string(),
                    args: vec!["-".to_string()],
                    tool_name: "google-java-format".to_string(),
                })
            } else {
                Some(FormatterSpec {
                    binary: "clang-format".to_string(),
                    args: vec!["--assume-filename=code.java".to_string()],
                    tool_name: "clang-format".to_string(),
                })
            }
        }
        "proto" | "protobuf" => Some(FormatterSpec {
            binary: "clang-format".to_string(),
            args: vec!["--assume-filename=code.proto".to_string()],
            tool_name: "clang-format".to_string(),
        }),
        "php" => Some(FormatterSpec {
            binary: "php-cs-fixer".to_string(),
            args: vec!["fix".to_string(), "--quiet".to_string(), "-".to_string()],
            tool_name: "php-cs-fixer".to_string(),
        }),
        "dart" => Some(FormatterSpec {
            binary: "dart".to_string(),
            args: vec!["format".to_string()],
            tool_name: "dart".to_string(),
        }),
        _ => None,
    }
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = path.metadata() {
        meta.is_file() && (meta.permissions().mode() & 0o111 != 0)
    } else {
        false
    }
}

#[cfg(not(unix))]
fn is_executable(path: &Path) -> bool {
    if let Ok(meta) = path.metadata() {
        meta.is_file()
    } else {
        false
    }
}

pub fn find_executable(name: &str) -> Option<PathBuf> {
    // 1. Search in PATH
    if let Some(path_var) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path_var) {
            #[cfg(windows)]
            {
                let exts = ["exe", "cmd", "bat"];
                let mut names = Vec::new();
                if name.contains('.') {
                    names.push(name.to_string());
                } else {
                    for ext in exts {
                        names.push(format!("{}.{}", name, ext));
                    }
                    names.push(name.to_string());
                }
                for n in names {
                    let candidate = dir.join(n);
                    if is_executable(&candidate) {
                        return Some(candidate);
                    }
                }
            }
            #[cfg(not(windows))]
            {
                let candidate = dir.join(name);
                if is_executable(&candidate) {
                    return Some(candidate);
                }
            }
        }
    }

    // 2. Extra user/system paths (common when running in GUI desktop environments)
    #[cfg(unix)]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let home_path = PathBuf::from(home);
            let user_candidates = [
                home_path.join(".local/bin").join(name),
                home_path.join(".cargo/bin").join(name),
            ];
            for candidate in user_candidates {
                if is_executable(&candidate) {
                    return Some(candidate);
                }
            }
        }

        let system_candidates = [
            PathBuf::from("/usr/local/bin").join(name),
            PathBuf::from("/usr/bin").join(name),
            PathBuf::from("/bin").join(name),
        ];
        for candidate in system_candidates {
            if is_executable(&candidate) {
                return Some(candidate);
            }
        }
    }

    #[cfg(windows)]
    {
        let mut search_dirs = Vec::new();
        if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            let user_path = PathBuf::from(user_profile);
            search_dirs.push(user_path.join(".cargo").join("bin"));
        }
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            let lad_path = PathBuf::from(local_app_data);
            search_dirs.push(lad_path.join("Programs").join("Python"));
        }
        let exts = ["exe", "cmd", "bat"];
        for dir in search_dirs {
            let mut names = Vec::new();
            if name.contains('.') {
                names.push(name.to_string());
            } else {
                for ext in exts {
                    names.push(format!("{}.{}", name, ext));
                }
                names.push(name.to_string());
            }
            for n in names {
                let candidate = dir.join(n);
                if is_executable(&candidate) {
                    return Some(candidate);
                }
            }
        }
    }

    None
}

pub fn format_code_internal(language: &str, code: String) -> Result<FormatResult, String> {
    if code.trim().is_empty() {
        return Ok(FormatResult {
            formatted: false,
            code,
            formatter: "none".to_string(),
            error: None,
        });
    }

    let spec = match get_formatter_spec(language) {
        Some(s) => s,
        None => {
            return Ok(FormatResult {
                formatted: false,
                code,
                formatter: "unsupported".to_string(),
                error: None,
            });
        }
    };

    let bin_path = match find_executable(&spec.binary) {
        Some(p) => p,
        None => {
            return Ok(FormatResult {
                formatted: false,
                code,
                formatter: format!("{}-missing", spec.tool_name),
                error: Some(format!("Formatter '{}' not found in PATH", spec.tool_name)),
            });
        }
    };

    let mut cmd = Command::new(bin_path);
    cmd.args(&spec.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return Ok(FormatResult {
                formatted: false,
                code,
                formatter: spec.tool_name,
                error: Some(format!("Failed to spawn formatter: {}", e)),
            });
        }
    };

    // Asynchronously write to stdin
    if let Some(mut stdin) = child.stdin.take() {
        let code_input = code.clone();
        std::thread::spawn(move || {
            let _ = stdin.write_all(code_input.as_bytes());
            let _ = stdin.flush();
        });
    }

    // Asynchronously read stdout and stderr to avoid deadlocks on pipe buffers
    let stdout_handle = child.stdout.take();
    let stderr_handle = child.stderr.take();

    let stdout_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(mut r) = stdout_handle {
            let _ = r.read_to_end(&mut buf);
        }
        buf
    });

    let stderr_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(mut r) = stderr_handle {
            let _ = r.read_to_end(&mut buf);
        }
        buf
    });

    // Wait with 2-second timeout
    let timeout = Duration::from_secs(2);
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(s)) => break s,
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Ok(FormatResult {
                        formatted: false,
                        code,
                        formatter: spec.tool_name,
                        error: Some("Formatter process timed out after 2s".to_string()),
                    });
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(e) => {
                return Ok(FormatResult {
                    formatted: false,
                    code,
                    formatter: spec.tool_name,
                    error: Some(format!("Error waiting for process: {}", e)),
                });
            }
        }
    };

    let stdout_bytes = stdout_thread.join().unwrap_or_default();
    let stderr_bytes = stderr_thread.join().unwrap_or_default();

    if status.success() {
        let formatted_output = String::from_utf8(stdout_bytes).unwrap_or_else(|_| code.clone());
        Ok(FormatResult {
            formatted: true,
            code: formatted_output,
            formatter: spec.tool_name,
            error: None,
        })
    } else {
        let err_msg = String::from_utf8_lossy(&stderr_bytes).trim().to_string();
        Ok(FormatResult {
            formatted: false,
            code,
            formatter: spec.tool_name,
            error: if err_msg.is_empty() {
                Some("Formatter exited with non-zero status".to_string())
            } else {
                Some(err_msg)
            },
        })
    }
}

#[tauri::command]
pub fn format_code(language: String, code: String) -> Result<FormatResult, String> {
    format_code_internal(&language, code)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_formatter_spec_mapping() {
        assert_eq!(get_formatter_spec("python").unwrap().tool_name, "ruff");
        assert_eq!(get_formatter_spec("py").unwrap().tool_name, "ruff");
        assert_eq!(get_formatter_spec("rust").unwrap().tool_name, "rustfmt");
        assert_eq!(get_formatter_spec("rs").unwrap().tool_name, "rustfmt");
        assert_eq!(get_formatter_spec("go").unwrap().tool_name, "gofmt");
        assert_eq!(get_formatter_spec("golang").unwrap().tool_name, "gofmt");
        assert_eq!(get_formatter_spec("cpp").unwrap().tool_name, "clang-format");
        assert_eq!(get_formatter_spec("c").unwrap().tool_name, "clang-format");
        assert_eq!(get_formatter_spec("csharp").unwrap().tool_name, "clang-format");
        assert_eq!(get_formatter_spec("proto").unwrap().tool_name, "clang-format");
        assert_eq!(get_formatter_spec("dart").unwrap().tool_name, "dart");
        assert_eq!(get_formatter_spec("php").unwrap().tool_name, "php-cs-fixer");
        assert!(get_formatter_spec("brainfuck").is_none());
    }

    #[test]
    fn test_format_empty_code() {
        let res = format_code_internal("python", "".to_string()).unwrap();
        assert!(!res.formatted);
        assert_eq!(res.formatter, "none");
        assert_eq!(res.code, "");
    }

    #[test]
    fn test_format_unsupported_language() {
        let res = format_code_internal("unsupported_lang", "test".to_string()).unwrap();
        assert!(!res.formatted);
        assert_eq!(res.formatter, "unsupported");
        assert_eq!(res.code, "test");
    }

    #[test]
    fn test_format_missing_tool_fallback() {
        // Test with a spec for a binary that is definitely missing
        let spec = FormatterSpec {
            binary: "definitely_non_existent_formatter_binary_12345".to_string(),
            args: vec![],
            tool_name: "fakefmt".to_string(),
        };
        assert!(find_executable(&spec.binary).is_none());
    }

    #[test]
    fn test_format_python_with_ruff() {
        if find_executable("ruff").is_none() {
            eprintln!("ruff not found, skipping integration test");
            return;
        }

        let unformatted = "def foo( x,  y ):\n    return x+y\n";
        let res = format_code_internal("python", unformatted.to_string()).unwrap();
        assert!(res.formatted);
        assert_eq!(res.formatter, "ruff");
        assert_eq!(res.code, "def foo(x, y):\n    return x + y\n");
    }

    #[test]
    fn test_format_rust_with_rustfmt() {
        if find_executable("rustfmt").is_none() {
            eprintln!("rustfmt not found, skipping integration test");
            return;
        }

        let unformatted = "fn main(){let a=1+2;}";
        let res = format_code_internal("rust", unformatted.to_string()).unwrap();
        assert!(res.formatted);
        assert_eq!(res.formatter, "rustfmt");
        assert!(res.code.contains("fn main() {\n    let a = 1 + 2;\n}"));
    }

    #[test]
    fn test_format_go_with_gofmt() {
        if find_executable("gofmt").is_none() {
            eprintln!("gofmt not found, skipping integration test");
            return;
        }

        let unformatted = "package main; func main(){println(1)}";
        let res = format_code_internal("go", unformatted.to_string()).unwrap();
        assert!(res.formatted);
        assert_eq!(res.formatter, "gofmt");
        assert!(res.code.contains("package main\n\nfunc main() { println(1) }"));
    }

    #[test]
    fn test_format_syntax_error_resilience() {
        if find_executable("ruff").is_none() {
            return;
        }

        let broken_code = "def broken(:\n    pass\n";
        let res = format_code_internal("python", broken_code.to_string()).unwrap();
        assert!(!res.formatted);
        assert_eq!(res.formatter, "ruff");
        assert_eq!(res.code, broken_code);
        assert!(res.error.is_some());
    }
}
