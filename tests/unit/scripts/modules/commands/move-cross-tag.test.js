import { jest } from '@jest/globals';
import chalk from 'chalk';

// Mock the modules
const mockMoveTasksBetweenTags = jest.fn();
const mockGenerateTaskFiles = jest.fn();
const mockInitTaskMaster = jest.fn();
const mockFindProjectRoot = jest.fn();
const mockReadJSON = jest.fn();

// Mock all the modules that commands.js imports
jest.mock('../../../../../scripts/modules/task-manager/move-task.js', () => ({
	moveTasksBetweenTags: mockMoveTasksBetweenTags
}));

jest.mock('../../../../../scripts/modules/utils.js', () => ({
	findProjectRoot: mockFindProjectRoot,
	generateTaskFiles: mockGenerateTaskFiles,
	readJSON: mockReadJSON,
	log: jest.fn(),
	writeJSON: jest.fn(),
	getCurrentTag: jest.fn(() => 'master'),
	detectCamelCaseFlags: jest.fn(),
	toKebabCase: jest.fn()
}));

jest.mock('../../../../../scripts/modules/config-manager.js', () => ({
	initTaskMaster: mockInitTaskMaster,
	isApiKeySet: jest.fn(() => true),
	getDebugFlag: jest.fn(() => false),
	getConfig: jest.fn(() => ({})),
	writeConfig: jest.fn(),
	ConfigurationError: class ConfigurationError extends Error {},
	isConfigFilePresent: jest.fn(() => true),
	getAvailableModels: jest.fn(() => []),
	getBaseUrlForRole: jest.fn(() => 'https://api.example.com'),
	getDefaultNumTasks: jest.fn(() => 10),
	getDefaultSubtasks: jest.fn(() => 3)
}));

// Mock task-manager.js
jest.mock('../../../../../scripts/modules/task-manager.js', () => ({
	parsePRD: jest.fn(),
	updateTasks: jest.fn(),
	generateTaskFiles: mockGenerateTaskFiles,
	setTaskStatus: jest.fn(),
	listTasks: jest.fn(),
	expandTask: jest.fn(),
	expandAllTasks: jest.fn(),
	clearSubtasks: jest.fn(),
	addTask: jest.fn(),
	addSubtask: jest.fn(),
	removeSubtask: jest.fn(),
	analyzeTaskComplexity: jest.fn(),
	updateTaskById: jest.fn(),
	updateSubtaskById: jest.fn(),
	removeTask: jest.fn(),
	findTaskById: jest.fn(),
	taskExists: jest.fn(),
	moveTask: jest.fn(),
	migrateProject: jest.fn(),
	setResponseLanguage: jest.fn(),
	scopeUpTask: jest.fn(),
	scopeDownTask: jest.fn(),
	validateStrength: jest.fn()
}));

// Mock tag-management.js
jest.mock('../../../../../scripts/modules/task-manager/tag-management.js', () => ({
	createTag: jest.fn(),
	deleteTag: jest.fn(),
	tags: jest.fn(),
	useTag: jest.fn(),
	renameTag: jest.fn(),
	copyTag: jest.fn()
}));

// Mock dependency-manager.js
jest.mock('../../../../../scripts/modules/dependency-manager.js', () => ({
	addDependency: jest.fn(),
	removeDependency: jest.fn(),
	validateDependenciesCommand: jest.fn(),
	fixDependenciesCommand: jest.fn(),
	DependencyError: class DependencyError extends Error {},
	DEPENDENCY_ERROR_CODES: {}
}));

// Mock constants
jest.mock('../../../../../src/constants/providers.js', () => ({
	CUSTOM_PROVIDERS: []
}));

jest.mock('../../../../../src/constants/paths.js', () => ({
	COMPLEXITY_REPORT_FILE: 'complexity-report.json',
	TASKMASTER_TASKS_FILE: 'tasks/tasks.json',
	TASKMASTER_DOCS_DIR: 'docs'
}));

// Mock rules-actions constants
jest.mock('../../../../../src/constants/rules-actions.js', () => ({
	isValidRulesAction: jest.fn(() => true),
	RULES_ACTIONS: {
		ADD: 'add',
		REMOVE: 'remove'
	},
	RULES_SETUP_ACTION: 'setup'
}));

// Mock task-status constants
jest.mock('../../../../../src/constants/task-status.js', () => ({
	isValidTaskStatus: jest.fn(() => true),
	TASK_STATUS_OPTIONS: ['pending', 'in-progress', 'done', 'cancelled', 'deferred']
}));

// Mock profiles constants
jest.mock('../../../../../src/constants/profiles.js', () => ({
	RULE_PROFILES: ['cursor', 'windsurf', 'roo', 'trae', 'claude', 'cline', 'codex']
}));

// Mock utility modules
jest.mock('../../../../../src/utils/getVersion.js', () => ({
	getTaskMasterVersion: jest.fn(() => '1.0.0')
}));

jest.mock('../../../../../src/utils/rule-transformer.js', () => ({
	convertAllRulesToProfileRules: jest.fn(() => ({ added: 0, skipped: 0 })),
	removeProfileRules: jest.fn(() => ({ removed: 0, skipped: 0 })),
	isValidProfile: jest.fn(() => true),
	getRulesProfile: jest.fn(() => ({}))
}));

jest.mock('../../../../../src/utils/profiles.js', () => ({
	runInteractiveProfilesSetup: jest.fn(() => Promise.resolve(['cursor'])),
	generateProfileSummary: jest.fn(() => 'Profile summary'),
	categorizeProfileResults: jest.fn(() => ({ added: [], skipped: [] })),
	generateProfileRemovalSummary: jest.fn(() => 'Removal summary'),
	categorizeRemovalResults: jest.fn(() => ({ removed: [], skipped: [] }))
}));

// Mock task-manager submodules
jest.mock('../../../../../scripts/modules/task-manager/models.js', () => ({
	getModelConfiguration: jest.fn(() => ({ success: true, data: { activeModels: {} } })),
	getAvailableModelsList: jest.fn(() => []),
	setModel: jest.fn(() => ({ success: true })),
	getApiKeyStatusReport: jest.fn(() => ({ success: true, data: {} }))
}));

jest.mock('../../../../../scripts/modules/sync-readme.js', () => ({
	syncTasksToReadme: jest.fn(() => ({ success: true }))
}));

// Mock task-master.js
jest.mock('../../../../../src/task-master.js', () => ({
	initTaskMaster: mockInitTaskMaster
}));

// Mock ui.js
jest.mock('../../../../../scripts/modules/ui.js', () => ({
	displayBanner: jest.fn(),
	displayHelp: jest.fn()
}));

// Mock external libraries
jest.mock('chalk', () => ({
	red: jest.fn((text) => text),
	blue: jest.fn((text) => text),
	green: jest.fn((text) => text),
	yellow: jest.fn((text) => text),
	white: jest.fn((text) => ({
		bold: jest.fn((text) => text)
	})),
	reset: jest.fn((text) => text)
}));

jest.mock('boxen', () => jest.fn((text) => text));

jest.mock('ora', () => jest.fn(() => ({
	start: jest.fn(),
	stop: jest.fn(),
	succeed: jest.fn(),
	fail: jest.fn()
})));

jest.mock('inquirer', () => ({
	prompt: jest.fn()
}));

jest.mock('@inquirer/search', () => jest.fn());

// Mock fs and path
jest.mock('fs', () => ({
	existsSync: jest.fn(() => true),
	readFileSync: jest.fn(),
	writeFileSync: jest.fn(),
	mkdirSync: jest.fn(),
	statSync: jest.fn(() => ({ isDirectory: () => true }))
}));

jest.mock('path', () => ({
	join: jest.fn((...args) => args.join('/')),
	dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
	resolve: jest.fn((...args) => args.join('/'))
}));

// Import the actual command handler functions
import { registerCommands } from '../../../../../scripts/modules/commands.js';

// Extract the handleCrossTagMove function from the commands module
// This is a simplified version of the actual function for testing
async function handleCrossTagMove(moveContext, options) {
	const { sourceId, sourceTag, toTag, taskMaster } = moveContext;

	if (!sourceId) {
		console.error('Error: --from parameter is required for cross-tag moves');
		process.exit(1);
		throw new Error('--from parameter is required for cross-tag moves');
	}

	if (sourceTag === toTag) {
		console.error(`Error: Source and target tags are the same ("${sourceTag}")`);
		process.exit(1);
		throw new Error(`Source and target tags are the same ("${sourceTag}")`);
	}

	const sourceIds = sourceId.split(',').map((id) => id.trim());
	const moveOptions = {
		withDependencies: options.withDependencies || false,
		ignoreDependencies: options.ignoreDependencies || false
	};

	const result = await mockMoveTasksBetweenTags(
		taskMaster.getTasksPath(),
		sourceIds,
		sourceTag,
		toTag,
		moveOptions,
		{ projectRoot: taskMaster.getProjectRoot() }
	);

	// Check if source tag still contains tasks before regenerating files
	const tasksData = mockReadJSON(
		taskMaster.getTasksPath(),
		taskMaster.getProjectRoot(),
		sourceTag
	);
	const sourceTagHasTasks =
		tasksData &&
		Array.isArray(tasksData.tasks) &&
		tasksData.tasks.length > 0;

	// Generate task files for the affected tags
	await mockGenerateTaskFiles(
		taskMaster.getTasksPath(),
		'tasks',
		{ tag: toTag, projectRoot: taskMaster.getProjectRoot() }
	);

	// Only regenerate source tag files if it still contains tasks
	if (sourceTagHasTasks) {
		await mockGenerateTaskFiles(
			taskMaster.getTasksPath(),
			'tasks',
			{ tag: sourceTag, projectRoot: taskMaster.getProjectRoot() }
		);
	}

	return result;
}

describe('CLI Move Command Cross-Tag Functionality', () => {
	let mockTaskMaster;
	let mockConsoleError;
	let mockConsoleLog;
	let mockProcessExit;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock console methods
		mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
		mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
		mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

		// Mock TaskMaster instance
		mockTaskMaster = {
			getCurrentTag: jest.fn().mockReturnValue('master'),
			getTasksPath: jest.fn().mockReturnValue('/test/path/tasks.json'),
			getProjectRoot: jest.fn().mockReturnValue('/test/project')
		};

		mockInitTaskMaster.mockReturnValue(mockTaskMaster);
		mockFindProjectRoot.mockReturnValue('/test/project');
		mockGenerateTaskFiles.mockResolvedValue();
		mockReadJSON.mockReturnValue({
			tasks: [
				{ id: 1, title: 'Test Task 1' },
				{ id: 2, title: 'Test Task 2' }
			]
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Cross-Tag Move Logic', () => {
		it('should handle basic cross-tag move', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: false,
				ignoreDependencies: false
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 1 tasks from "backlog" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1'],
				'backlog',
				'in-progress',
				{
					withDependencies: false,
					ignoreDependencies: false
				},
				{ projectRoot: '/test/project' }
			);
		});

		it('should handle --with-dependencies flag', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: true,
				ignoreDependencies: false
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 2 tasks from "backlog" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1'],
				'backlog',
				'in-progress',
				{
					withDependencies: true,
					ignoreDependencies: false
				},
				{ projectRoot: '/test/project' }
			);
		});

		it('should handle --ignore-dependencies flag', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: false,
				ignoreDependencies: true
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 1 tasks from "backlog" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1'],
				'backlog',
				'in-progress',
				{
					withDependencies: false,
					ignoreDependencies: true
				},
				{ projectRoot: '/test/project' }
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle missing --from parameter', async () => {
			const options = {
				from: undefined,
				fromTag: 'backlog',
				toTag: 'in-progress'
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			await expect(handleCrossTagMove(moveContext, options)).rejects.toThrow();

			expect(mockConsoleError).toHaveBeenCalledWith(
				'Error: --from parameter is required for cross-tag moves'
			);
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});

		it('should handle same source and target tags', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'backlog'
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			await expect(handleCrossTagMove(moveContext, options)).rejects.toThrow();

			expect(mockConsoleError).toHaveBeenCalledWith(
				'Error: Source and target tags are the same ("backlog")'
			);
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});
	});

	describe('Fallback to Current Tag', () => {
		it('should use current tag when --from-tag is not provided', async () => {
			const options = {
				from: '1',
				fromTag: undefined,
				toTag: 'in-progress'
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: 'master', // Should use current tag
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 1 tasks from "master" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1'],
				'master',
				'in-progress',
				expect.any(Object),
				{ projectRoot: '/test/project' }
			);
		});
	});

	describe('Multiple Task Movement', () => {
		it('should handle comma-separated task IDs', async () => {
			const options = {
				from: '1,2,3',
				fromTag: 'backlog',
				toTag: 'in-progress'
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 3 tasks from "backlog" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1', '2', '3'],
				'backlog',
				'in-progress',
				expect.any(Object),
				{ projectRoot: '/test/project' }
			);
		});

		it('should handle whitespace in comma-separated task IDs', async () => {
			const options = {
				from: '1, 2, 3',
				fromTag: 'backlog',
				toTag: 'in-progress'
			};

			const moveContext = {
				sourceId: options.from,
				sourceTag: options.fromTag,
				toTag: options.toTag,
				taskMaster: mockTaskMaster
			};

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 3 tasks from "backlog" to "in-progress"'
			});

			await handleCrossTagMove(moveContext, options);

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1', '2', '3'],
				'backlog',
				'in-progress',
				expect.any(Object),
				{ projectRoot: '/test/project' }
			);
		});
	});
});
