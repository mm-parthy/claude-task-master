#!/usr/bin/env node

/**
 * Demo script to show test mode functionality for the web server
 *
 * This script demonstrates:
 * 1. How test mode isolates data from production
 * 2. File path differences between production and test mode
 * 3. Safe testing without data pollution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	isTestMode,
	getTaskMasterDirectory,
	getTasksFilePath,
	getConfigFilePath,
	getWebServerStateFilePath
} from '../web/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Demo project root (use current directory)
const demoProjectRoot = process.cwd();

console.log('🎯 Task Master Web Server Test Mode Demo\n');

// Demo 1: Test mode detection
console.log('1️⃣  Test Mode Detection');
console.log('========================');

console.log('Production mode (default):');
console.log(`  isTestMode({}) = ${isTestMode({})}`);

console.log('\nTest mode via options:');
console.log(
	`  isTestMode({ testMode: true }) = ${isTestMode({ testMode: true })}`
);

console.log('\nTest mode via environment variable:');
process.env.TASKMASTER_TEST_MODE = 'true';
console.log(`  TASKMASTER_TEST_MODE=true: ${isTestMode({})}`);
delete process.env.TASKMASTER_TEST_MODE;

console.log('\n');

// Demo 2: Path isolation
console.log('2️⃣  File Path Isolation');
console.log('========================');

const productionPaths = {
	directory: getTaskMasterDirectory(demoProjectRoot, false),
	tasks: getTasksFilePath(demoProjectRoot, false),
	config: getConfigFilePath(demoProjectRoot, false),
	webState: getWebServerStateFilePath(demoProjectRoot, false)
};

const testPaths = {
	directory: getTaskMasterDirectory(demoProjectRoot, true),
	tasks: getTasksFilePath(demoProjectRoot, true),
	config: getConfigFilePath(demoProjectRoot, true),
	webState: getWebServerStateFilePath(demoProjectRoot, true)
};

console.log('Production paths:');
console.log(`  Directory: ${productionPaths.directory}`);
console.log(`  Tasks:     ${productionPaths.tasks}`);
console.log(`  Config:    ${productionPaths.config}`);
console.log(`  Web State: ${productionPaths.webState}`);

console.log('\nTest mode paths:');
console.log(`  Directory: ${testPaths.directory}`);
console.log(`  Tasks:     ${testPaths.tasks}`);
console.log(`  Config:    ${testPaths.config}`);
console.log(`  Web State: ${testPaths.webState}`);

console.log(
	'\n✅ Notice: All test paths use .taskmaster-test/ instead of .taskmaster/'
);
console.log('\n');

// Demo 3: File isolation demonstration
console.log('3️⃣  File Isolation Demo');
console.log('========================');

// Create demo production file
const demoProductionDir = path.join(demoProjectRoot, '.taskmaster-demo');
const demoProductionTasks = path.join(demoProductionDir, 'tasks', 'tasks.json');

// Create demo test file
const demoTestDir = path.join(demoProjectRoot, '.taskmaster-test-demo');
const demoTestTasks = path.join(demoTestDir, 'tasks', 'tasks.json');

try {
	// Create production demo data
	fs.mkdirSync(path.dirname(demoProductionTasks), { recursive: true });
	fs.writeFileSync(
		demoProductionTasks,
		JSON.stringify(
			{
				currentTag: 'master',
				tags: {
					master: {
						tasks: [
							{ id: 1, title: 'Production Task 1', status: 'pending' },
							{ id: 2, title: 'Production Task 2', status: 'done' }
						]
					}
				}
			},
			null,
			2
		)
	);

	// Create test demo data
	fs.mkdirSync(path.dirname(demoTestTasks), { recursive: true });
	fs.writeFileSync(
		demoTestTasks,
		JSON.stringify(
			{
				currentTag: 'master',
				tags: {
					master: {
						tasks: [
							{ id: 1, title: 'Test Task 1', status: 'pending' },
							{ id: 2, title: 'Test Task 2', status: 'in-progress' },
							{ id: 3, title: 'Test Task 3', status: 'pending' }
						]
					}
				}
			},
			null,
			2
		)
	);

	console.log('Created demo files:');
	console.log(`  Production: ${demoProductionTasks}`);
	console.log(`  Test:       ${demoTestTasks}`);

	// Read and compare
	const productionData = JSON.parse(
		fs.readFileSync(demoProductionTasks, 'utf8')
	);
	const testData = JSON.parse(fs.readFileSync(demoTestTasks, 'utf8'));

	console.log('\nProduction tasks:');
	productionData.tags.master.tasks.forEach((task) => {
		console.log(`  ${task.id}. ${task.title} (${task.status})`);
	});

	console.log('\nTest tasks:');
	testData.tags.master.tasks.forEach((task) => {
		console.log(`  ${task.id}. ${task.title} (${task.status})`);
	});

	console.log(
		"\n✅ Files are completely isolated - changes to test data don't affect production"
	);

	// Cleanup demo files
	fs.rmSync(demoProductionDir, { recursive: true, force: true });
	fs.rmSync(demoTestDir, { recursive: true, force: true });
} catch (error) {
	console.error('Demo error:', error.message);
}

console.log('\n');

// Demo 4: Usage examples
console.log('4️⃣  Usage Examples');
console.log('==================');

console.log('Start web server in test mode:');
console.log('  npm run start:web:test');
console.log('  node web/server.js --test-mode');
console.log('  TASKMASTER_TEST_MODE=true node web/server.js');

console.log('\nRun E2E tests safely:');
console.log('  npm run test:web');
console.log('  ./tests/e2e/test_web_api_endpoints.sh');

console.log('\nDevelopment with test mode:');
console.log('  npm run start:web:test-dev');

console.log('\nProduction (normal) mode:');
console.log('  npm run start:web');
console.log('  npm run start:web:prod');

console.log('\n🎉 Test mode prevents production data pollution!');
console.log('📁 Your .taskmaster/ directory stays safe during testing');
console.log('🧪 Tests use .taskmaster-test/ for complete isolation');
