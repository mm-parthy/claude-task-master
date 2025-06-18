# Testing Guide for Web commands

## E2E Test Development Guidelines

### Command Execution Rules

**NEVER** use direct CLI execution without timeout protection:

```bash
# ❌ DON'T: This can hang indefinitely
output=$($CLI_CMD some-command)
```

**ALWAYS** use timeout-protected functions from `e2e_helpers.sh`:

#### 1. For commands that SHOULD succeed:

```bash
# ✅ DO: Use expect_success for commands that should work
output=$(expect_success 30 "command-name" $CLI_CMD some-command --flag)
```

#### 2. For commands that SHOULD fail:

```bash
# ✅ DO: Use expect_failure for commands that should fail
output=$(expect_failure 10 "invalid-command" $CLI_CMD invalid --command)
```

#### 3. For commands with uncertain outcome:

```bash
# ✅ DO: Use safe_run_cmd when unsure of outcome
output=$(safe_run_cmd 20 "uncertain-command" $CLI_CMD some --command)
exit_code=$?
if [ $exit_code -eq 0 ]; then
    # Handle success
else
    # Handle failure
fi
```

### Timeout Guidelines

- **Simple commands**: 10-15 seconds
- **Server operations**: 30 seconds
- **AI operations**: 60-120 seconds

### Cross-Platform Compatibility

The timeout utilities automatically detect available timeout commands:

- **Linux**: Uses `timeout` command
- **macOS**: Uses `gtimeout` (from `brew install coreutils`)
- **Fallback**: Runs without timeout protection with warning

### Prevention of Hanging Issues

These patterns prevent common hanging scenarios:

- Commands waiting for user input
- Foreground servers that wait for Ctrl+C
- Network operations that timeout
- Infinite loops or deadlocks

### Examples from Fixed Tests

```bash
# Before (problematic):
error_output=$($CLI_CMD web-start --port=0 2>&1 || true)

# After (safe):
error_output=$(expect_failure 10 "zero-port" $CLI_CMD web-start --port=0)
```

This infrastructure ensures all E2E tests complete reliably without manual intervention.

## Web Server E2E Tests

The project includes comprehensive E2E tests for web server functionality:

### Available Web Tests

- `test_web_basic_functionality.sh`: Basic server start/stop and status functionality
- `test_web_error_handling.sh`: Error scenarios and edge cases
- `test_web_server_functionality.sh`: Comprehensive functionality testing

### Running Web Server Tests

To run the comprehensive web server test:

```bash
./tests/e2e/test_web_server_functionality.sh
```

### Web Test Coverage

The comprehensive web server test covers:

- **Server Startup**: Daemon mode, foreground mode, configuration options
- **HTTP Responses**: Endpoint testing, static file serving, status codes
- **WebSocket Functionality**: Connection establishment, message handling (where available)
- **File Watching**: Change detection and client notification
- **Configuration Options**: `--skip-websocket`, `--skip-watcher`, custom host/port
- **Concurrent Connections**: Multiple simultaneous connection handling
- **Shutdown Operations**: Graceful shutdown and force stop
- **Status Tracking**: Server lifecycle monitoring

### Test Infrastructure

Web tests use unique ports (3008-3010) to avoid conflicts and include:

- Comprehensive cleanup with trap handlers
- Cross-platform timeout utilities
- Cost tracking for AI operations
- Structured logging with detailed output
