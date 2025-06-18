/**
 * Test Mode Integration Tests for Web Server
 *
 * These tests verify that test mode properly isolates test data from production data
 * by using .taskmaster-test/ directory structure instead of .taskmaster/
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	isTestMode,
	getTaskMasterDirectory,
	getTasksFilePath,
	getConfigFilePath,
	getWebServerStateFilePath
} from '../../web/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Web Server Test Mode', () => {
	const testProjectRoot = path.join(__dirname, 'test-project');

	beforeEach(() => {
		// Create test project directory
		if (!fs.existsSync(testProjectRoot)) {
			fs.mkdirSync(testProjectRoot, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test directories
		const productionDir = path.join(testProjectRoot, '.taskmaster');
		const testDir = path.join(testProjectRoot, '.taskmaster-test');

		if (fs.existsSync(productionDir)) {
			fs.rmSync(productionDir, { recursive: true, force: true });
		}
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
		if (fs.existsSync(testProjectRoot)) {
			fs.rmSync(testProjectRoot, { recursive: true, force: true });
		}
	});

	describe('isTestMode function', () => {
		test('should detect test mode from options', () => {
			// Temporarily override NODE_ENV to prevent Jest test environment interference
			const originalNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			expect(isTestMode({ testMode: true })).toBe(true);
			expect(isTestMode({ testMode: false })).toBe(false);
			expect(isTestMode({})).toBe(false);

			// Restore original NODE_ENV
			process.env.NODE_ENV = originalNodeEnv;
		});

		test('should detect test mode from environment variables', () => {
			const originalEnv = process.env.TASKMASTER_TEST_MODE;
			const originalNodeEnv = process.env.NODE_ENV;

			// Set to development to isolate from Jest test environment
			process.env.NODE_ENV = 'development';

			// Test TASKMASTER_TEST_MODE environment variable
			process.env.TASKMASTER_TEST_MODE = 'true';
			expect(isTestMode({})).toBe(true);

			process.env.TASKMASTER_TEST_MODE = 'false';
			expect(isTestMode({})).toBe(false);

			delete process.env.TASKMASTER_TEST_MODE;

			// Test NODE_ENV=test
			process.env.NODE_ENV = 'test';
			expect(isTestMode({})).toBe(true);

			process.env.NODE_ENV = 'development';
			expect(isTestMode({})).toBe(false);

			// Restore original environment
			if (originalEnv !== undefined) {
				process.env.TASKMASTER_TEST_MODE = originalEnv;
			}
			process.env.NODE_ENV = originalNodeEnv;
		});

		test('should prioritize options over environment variables', () => {
			const originalEnv = process.env.TASKMASTER_TEST_MODE;
			const originalNodeEnv = process.env.NODE_ENV;

			// Set to development to isolate from Jest test environment
			process.env.NODE_ENV = 'development';

			process.env.TASKMASTER_TEST_MODE = 'true';
			expect(isTestMode({ testMode: false })).toBe(false);

			process.env.TASKMASTER_TEST_MODE = 'false';
			expect(isTestMode({ testMode: true })).toBe(true);

			// Restore original environment
			if (originalEnv !== undefined) {
				process.env.TASKMASTER_TEST_MODE = originalEnv;
			} else {
				delete process.env.TASKMASTER_TEST_MODE;
			}
			process.env.NODE_ENV = originalNodeEnv;
		});
	});

	describe('Path isolation functions', () => {
		test('should use different directories for production and test mode', () => {
			const productionDir = getTaskMasterDirectory(testProjectRoot, false);
			const testDir = getTaskMasterDirectory(testProjectRoot, true);

			expect(productionDir).toBe(path.join(testProjectRoot, '.taskmaster'));
			expect(testDir).toBe(path.join(testProjectRoot, '.taskmaster-test'));
			expect(productionDir).not.toBe(testDir);
		});

		test('should use different tasks file paths for production and test mode', () => {
			const productionPath = getTasksFilePath(testProjectRoot, false);
			const testPath = getTasksFilePath(testProjectRoot, true);

			expect(productionPath).toBe(
				path.join(testProjectRoot, '.taskmaster', 'tasks', 'tasks.json')
			);
			expect(testPath).toBe(
				path.join(testProjectRoot, '.taskmaster-test', 'tasks', 'tasks.json')
			);
			expect(productionPath).not.toBe(testPath);
		});

		test('should use different config file paths for production and test mode', () => {
			const productionPath = getConfigFilePath(testProjectRoot, false);
			const testPath = getConfigFilePath(testProjectRoot, true);

			expect(productionPath).toBe(
				path.join(testProjectRoot, '.taskmaster', 'config.json')
			);
			expect(testPath).toBe(
				path.join(testProjectRoot, '.taskmaster-test', 'config.json')
			);
			expect(productionPath).not.toBe(testPath);
		});

		test('should use different web server state file paths for production and test mode', () => {
			const productionPath = getWebServerStateFilePath(testProjectRoot, false);
			const testPath = getWebServerStateFilePath(testProjectRoot, true);

			expect(productionPath).toBe(
				path.join(testProjectRoot, '.taskmaster', 'web-server-state.json')
			);
			expect(testPath).toBe(
				path.join(testProjectRoot, '.taskmaster-test', 'web-server-state.json')
			);
			expect(productionPath).not.toBe(testPath);
		});
	});

	describe('File isolation verification', () => {
		test('should not interfere between production and test files', () => {
			// Create production files
			const productionDir = getTaskMasterDirectory(testProjectRoot, false);
			const productionTasksPath = getTasksFilePath(testProjectRoot, false);

			fs.mkdirSync(path.dirname(productionTasksPath), { recursive: true });
			fs.writeFileSync(
				productionTasksPath,
				JSON.stringify(
					{
						currentTag: 'master',
						tags: {
							master: {
								tasks: [{ id: 1, title: 'Production Task', status: 'pending' }]
							}
						}
					},
					null,
					2
				)
			);

			// Create test files
			const testDir = getTaskMasterDirectory(testProjectRoot, true);
			const testTasksPath = getTasksFilePath(testProjectRoot, true);

			fs.mkdirSync(path.dirname(testTasksPath), { recursive: true });
			fs.writeFileSync(
				testTasksPath,
				JSON.stringify(
					{
						currentTag: 'master',
						tags: {
							master: {
								tasks: [{ id: 1, title: 'Test Task', status: 'pending' }]
							}
						}
					},
					null,
					2
				)
			);

			// Verify files are separate
			expect(fs.existsSync(productionTasksPath)).toBe(true);
			expect(fs.existsSync(testTasksPath)).toBe(true);

			const productionData = JSON.parse(
				fs.readFileSync(productionTasksPath, 'utf8')
			);
			const testData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(productionData.tags.master.tasks[0].title).toBe('Production Task');
			expect(testData.tags.master.tasks[0].title).toBe('Test Task');

			// Verify directories are different
			expect(path.dirname(productionTasksPath)).not.toBe(
				path.dirname(testTasksPath)
			);
		});
	});
});
