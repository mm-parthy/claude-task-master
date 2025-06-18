# Web Server Test Mode

The Task Master web server supports a **test mode** that isolates test data from production data to prevent test pollution. When test mode is enabled, all Task Master files are stored in a separate `.taskmaster-test/` directory instead of the standard `.taskmaster/` directory.

## Why Use Test Mode?

- **Data Protection**: Prevents E2E tests and development experiments from overwriting your real project tasks
- **Clean Testing**: Each test run starts with a clean slate without affecting production data
- **Safe Development**: Experiment with the web interface without fear of data loss
- **Parallel Development**: Run tests while continuing to use the CLI in production mode

## File Structure Comparison

### Production Mode (Default)

```
project/
├── .taskmaster/
│   ├── tasks/
│   │   └── tasks.json          # Your real tasks
│   ├── config.json             # Production configuration
│   ├── state.json              # Production state
│   ├── web-server-state.json   # Production web server state
│   └── reports/                # Production reports
```

### Test Mode

```
project/
├── .taskmaster/                # Production data (untouched)
│   └── ...
├── .taskmaster-test/           # Test data (isolated)
│   ├── tasks/
│   │   └── tasks.json          # Test tasks only
│   ├── config.json             # Test configuration
│   ├── state.json              # Test state
│   ├── web-server-state.json   # Test web server state
│   └── reports/                # Test reports
```

## How to Enable Test Mode

### Method 1: Command Line Flag

```bash
# Start web server in test mode
node web/server.js --test-mode

# With custom port
node web/server.js --port=3002 --test-mode

# Using npm scripts
npm run start:web:test
npm run start:web:test-dev
```

### Method 2: Environment Variable

```bash
# Set environment variable
export TASKMASTER_TEST_MODE=true
node web/server.js

# Or inline
TASKMASTER_TEST_MODE=true node web/server.js
```

### Method 3: NODE_ENV=test

```bash
# NODE_ENV=test automatically enables test mode
NODE_ENV=test node web/server.js
```

## Priority Order

Test mode detection follows this priority order:

1. `--test-mode` command line flag (highest priority)
2. `TASKMASTER_TEST_MODE=true` environment variable
3. `NODE_ENV=test` environment variable
4. Default: `false` (production mode)

## Usage Examples

### Running E2E Tests

```bash
# Start server in test mode for testing
npm run start:web:test -- --port=3002

# Run E2E tests (they use TASKMASTER_TEST_MODE=true)
npm run test:web

# Or manually
./tests/e2e/test_web_api_endpoints.sh
```

### Development Testing

```bash
# Start in test mode for safe experimentation
npm run start:web:test-dev

# Your production .taskmaster/ data remains untouched
# All API calls use .taskmaster-test/ directory
```

### Production Usage

```bash
# Normal production mode (default)
npm run start:web
npm run start:web:dev
npm run start:web:prod

# Uses .taskmaster/ directory as expected
```

## API Behavior in Test Mode

When the web server runs in test mode:

- All API endpoints automatically use `.taskmaster-test/` paths
- Task operations (create, update, delete) affect only test data
- File generation and reports go to test directories
- State management uses test-specific state files
- No changes are made to production `.taskmaster/` directory

## Verification

You can verify test mode is working by:

1. **Server Logs**: Look for "Test Mode: ENABLED" in startup logs
2. **File System**: Check that `.taskmaster-test/` directory is created
3. **Health Endpoint**: Check `/api/health` response for test mode indicators
4. **Directory Isolation**: Confirm production `.taskmaster/` is unchanged

## Best Practices

1. **Always use test mode for automated tests**

   ```bash
   TASKMASTER_TEST_MODE=true npm run test:web
   ```

2. **Use test mode for development experiments**

   ```bash
   npm run start:web:test-dev
   ```

3. **Keep production and test modes separate**

   - Don't mix test and production data
   - Use different ports for test servers
   - Clear test data between test runs if needed

4. **Clean up test data periodically**
   ```bash
   rm -rf .taskmaster-test/
   ```

## Troubleshooting

### Test Mode Not Working?

- Check server startup logs for "Test Mode: ENABLED"
- Verify environment variables: `echo $TASKMASTER_TEST_MODE`
- Ensure you're using the correct command line flags

### Production Data Modified During Tests?

- Confirm test mode is enabled before running tests
- Check that `.taskmaster/` directory is unchanged
- Verify E2E tests use `TASKMASTER_TEST_MODE=true`

### Tests Interfering with Each Other?

- Clear `.taskmaster-test/` between test runs
- Use different test databases/contexts
- Ensure proper test isolation

## Integration with CI/CD

For continuous integration, always enable test mode:

```yaml
# GitHub Actions example
- name: Run Web API Tests
  env:
    TASKMASTER_TEST_MODE: true
  run: |
    npm run start:web:test -- --port=3002 &
    sleep 5
    npm run test:web
```

This ensures your CI/CD pipeline never affects production Task Master data.
