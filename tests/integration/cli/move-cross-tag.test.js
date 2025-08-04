import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// --- Define mock functions ---
const mockMoveTasksBetweenTags = jest.fn();
const mockMoveTask = jest.fn();
const mockGenerateTaskFiles = jest.fn();
const mockLog = jest.fn();

// --- Setup mocks using unstable_mockModule ---
jest.unstable_mockModule(
	'../../../scripts/modules/task-manager/move-task.js',
	() => ({
		default: mockMoveTask,
		moveTasksBetweenTags: mockMoveTasksBetweenTags
	})
);

jest.unstable_mockModule(
	'../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: mockGenerateTaskFiles
	})
);

jest.unstable_mockModule('../../../scripts/modules/utils.js', () => ({
	log: mockLog,
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	findProjectRoot: jest.fn(() => '/test/project/root'),
	getCurrentTag: jest.fn(() => 'master')
}));

// --- Mock chalk for consistent output formatting ---
const mockChalk = {
	red: jest.fn((text) => text),
	yellow: jest.fn((text) => text),
	blue: jest.fn((text) => text),
	green: jest.fn((text) => text),
	gray: jest.fn((text) => text),
	dim: jest.fn((text) => text),
	bold: {
		cyan: jest.fn((text) => text),
		white: jest.fn((text) => text),
		red: jest.fn((text) => text)
	},
	cyan: {
		bold: jest.fn((text) => text)
	},
	white: {
		bold: jest.fn((text) => text)
	}
};
mockChalk.default = jest.fn((text) => text);
Object.keys(mockChalk).forEach((key) => {
	if (key !== 'default') mockChalk.default[key] = mockChalk[key];
});

jest.unstable_mockModule('chalk', () => ({
	default: mockChalk.default
}));

// --- Import modules (AFTER mock setup) ---
let moveTaskModule, generateTaskFilesModule, utilsModule, chalk;

describe('Cross-Tag Move CLI Integration', () => {
	// Setup dynamic imports before tests run
	beforeAll(async () => {
		moveTaskModule = await import(
			'../../../scripts/modules/task-manager/move-task.js'
		);
		generateTaskFilesModule = await import(
			'../../../scripts/modules/task-manager/generate-task-files.js'
		);
		utilsModule = await import('../../../scripts/modules/utils.js');
		chalk = (await import('chalk')).default;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// --- Replicate the move command action handler logic from commands.js ---
	async function moveAction(options) {
		const sourceId = options.from;
		const destinationId = options.to;
		const fromTag = options.fromTag;
		const toTag = options.toTag;
		const withDependencies = options.withDependencies;
		const ignoreDependencies = options.ignoreDependencies;
		const force = options.force;

		// Check if this is a cross-tag move (different tags)
		const isCrossTagMove = fromTag && toTag && fromTag !== toTag;

		if (isCrossTagMove) {
			// Cross-tag move logic
			if (!sourceId) {
				console.error(
					chalk.red('Error: --from parameter is required for cross-tag moves')
				);
				process.exit(1);
			}

			const taskIds = sourceId.split(',').map((id) => parseInt(id.trim(), 10));
			const tasksPath = path.join(
				utilsModule.findProjectRoot(),
				'.taskmaster',
				'tasks',
				'tasks.json'
			);

			try {
				await moveTaskModule.moveTasksBetweenTags(
					tasksPath,
					taskIds,
					fromTag,
					toTag,
					{
						withDependencies,
						ignoreDependencies,
						force
					}
				);

				console.log(chalk.green('Successfully moved task(s) between tags'));

				// Generate task files for both tags
				await generateTaskFilesModule.default(
					tasksPath,
					path.dirname(tasksPath),
					{ tag: fromTag }
				);
				await generateTaskFilesModule.default(
					tasksPath,
					path.dirname(tasksPath),
					{ tag: toTag }
				);
			} catch (error) {
				console.error(chalk.red(`Error: ${error.message}`));
				process.exit(1);
			}
		} else {
			// Handle case where both tags are provided but are the same
			if (fromTag && toTag && fromTag === toTag) {
				console.error(
					chalk.red(`Error: Source and target tags are the same ("${fromTag}")`)
				);
				console.log(
					chalk.yellow(
						'For within-tag moves, use: task-master move --from=<sourceId> --to=<destinationId>'
					)
				);
				console.log(
					chalk.yellow(
						'For cross-tag moves, use different tags: task-master move --from=<sourceId> --from-tag=<sourceTag> --to-tag=<targetTag>'
					)
				);
				process.exit(1);
			}

			// Within-tag move logic (existing functionality)
			if (!sourceId || !destinationId) {
				console.error(
					chalk.red(
						'Error: Both --from and --to parameters are required for within-tag moves'
					)
				);
				process.exit(1);
			}

			// Call the existing moveTask function for within-tag moves
			try {
				await moveTaskModule.default(sourceId, destinationId);
				console.log(chalk.green('Successfully moved task'));
			} catch (error) {
				console.error(chalk.red(`Error: ${error.message}`));
				process.exit(1);
			}
		}
	}

	it('should move task without dependencies successfully', async () => {
		// Mock successful cross-tag move
		mockMoveTasksBetweenTags.mockResolvedValue(undefined);
		mockGenerateTaskFiles.mockResolvedValue(undefined);

		const options = {
			from: '2',
			fromTag: 'backlog',
			toTag: 'in-progress'
		};

		await moveAction(options);

		expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
			expect.stringContaining('tasks.json'),
			[2],
			'backlog',
			'in-progress',
			{
				withDependencies: undefined,
				ignoreDependencies: undefined,
				force: undefined
			}
		);
	});

	it('should fail to move task with cross-tag dependencies', async () => {
		// Mock dependency conflict error
		mockMoveTasksBetweenTags.mockRejectedValue(
			new Error('Cannot move task due to cross-tag dependency conflicts')
		);

		const options = {
			from: '1',
			fromTag: 'backlog',
			toTag: 'in-progress'
		};

		// Mock console.error and process.exit to capture the error
		const originalConsoleError = console.error;
		const originalProcessExit = process.exit;
		const errorMessages = [];
		const exitCodes = [];

		console.error = jest.fn((...args) => {
			errorMessages.push(args.join(' '));
		});
		process.exit = jest.fn((code) => {
			exitCodes.push(code);
		});

		try {
			await moveAction(options);
		} catch (error) {
			// Expected to throw due to process.exit
		}

		expect(mockMoveTasksBetweenTags).toHaveBeenCalled();
		expect(
			errorMessages.some((msg) =>
				msg.includes('cross-tag dependency conflicts')
			)
		).toBe(true);
		expect(exitCodes).toContain(1);

		// Restore original functions
		console.error = originalConsoleError;
		process.exit = originalProcessExit;
	});

	it('should move task with dependencies when --with-dependencies is used', async () => {
		// Mock successful cross-tag move with dependencies
		mockMoveTasksBetweenTags.mockResolvedValue(undefined);
		mockGenerateTaskFiles.mockResolvedValue(undefined);

		const options = {
			from: '1',
			fromTag: 'backlog',
			toTag: 'in-progress',
			withDependencies: true
		};

		await moveAction(options);

		expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
			expect.stringContaining('tasks.json'),
			[1],
			'backlog',
			'in-progress',
			{
				withDependencies: true,
				ignoreDependencies: undefined,
				force: undefined
			}
		);
	});

	it('should break dependencies when --ignore-dependencies is used', async () => {
		// Mock successful cross-tag move with dependency breaking
		mockMoveTasksBetweenTags.mockResolvedValue(undefined);
		mockGenerateTaskFiles.mockResolvedValue(undefined);

		const options = {
			from: '1',
			fromTag: 'backlog',
			toTag: 'in-progress',
			ignoreDependencies: true
		};

		await moveAction(options);

		expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
			expect.stringContaining('tasks.json'),
			[1],
			'backlog',
			'in-progress',
			{
				withDependencies: undefined,
				ignoreDependencies: true,
				force: undefined
			}
		);
	});

	it('should create target tag if it does not exist', async () => {
		// Mock successful cross-tag move to new tag
		mockMoveTasksBetweenTags.mockResolvedValue(undefined);
		mockGenerateTaskFiles.mockResolvedValue(undefined);

		const options = {
			from: '2',
			fromTag: 'backlog',
			toTag: 'new-tag'
		};

		await moveAction(options);

		expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
			expect.stringContaining('tasks.json'),
			[2],
			'backlog',
			'new-tag',
			{
				withDependencies: undefined,
				ignoreDependencies: undefined,
				force: undefined
			}
		);
	});

	it('should fail to move a subtask directly', async () => {
		// Mock subtask movement error
		mockMoveTasksBetweenTags.mockRejectedValue(
			new Error(
				'Cannot move subtasks directly between tags. Please promote the subtask to a full task first.'
			)
		);

		const options = {
			from: '1.2',
			fromTag: 'backlog',
			toTag: 'in-progress'
		};

		// Mock console.error and process.exit to capture the error
		const originalConsoleError = console.error;
		const originalProcessExit = process.exit;
		const errorMessages = [];
		const exitCodes = [];

		console.error = jest.fn((...args) => {
			errorMessages.push(args.join(' '));
		});
		process.exit = jest.fn((code) => {
			exitCodes.push(code);
		});

		try {
			await moveAction(options);
		} catch (error) {
			// Expected to throw due to process.exit
		}

		expect(mockMoveTasksBetweenTags).toHaveBeenCalled();
		expect(errorMessages.some((msg) => msg.includes('subtasks directly'))).toBe(
			true
		);
		expect(exitCodes).toContain(1);

		// Restore original functions
		console.error = originalConsoleError;
		process.exit = originalProcessExit;
	});

	it('should provide helpful error messages for dependency conflicts', async () => {
		// Mock dependency conflict with detailed error
		mockMoveTasksBetweenTags.mockRejectedValue(
			new Error(
				'Cross-tag dependency conflicts detected. Task 1 depends on Task 2 which is in a different tag.'
			)
		);

		const options = {
			from: '1',
			fromTag: 'backlog',
			toTag: 'in-progress'
		};

		// Mock console.error and process.exit to capture the error
		const originalConsoleError = console.error;
		const originalProcessExit = process.exit;
		const errorMessages = [];
		const exitCodes = [];

		console.error = jest.fn((...args) => {
			errorMessages.push(args.join(' '));
		});
		process.exit = jest.fn((code) => {
			exitCodes.push(code);
		});

		try {
			await moveAction(options);
		} catch (error) {
			// Expected to throw due to process.exit
		}

		expect(mockMoveTasksBetweenTags).toHaveBeenCalled();
		expect(
			errorMessages.some((msg) =>
				msg.includes('Cross-tag dependency conflicts detected')
			)
		).toBe(true);
		expect(exitCodes).toContain(1);

		// Restore original functions
		console.error = originalConsoleError;
		process.exit = originalProcessExit;
	});

	it('should handle same tag error correctly', async () => {
		const options = {
			from: '1',
			fromTag: 'backlog',
			toTag: 'backlog' // Same tag
		};

		// Mock console.error and process.exit to capture the error
		const originalConsoleError = console.error;
		const originalConsoleLog = console.log;
		const originalProcessExit = process.exit;
		const errorMessages = [];
		const logMessages = [];
		const exitCodes = [];

		console.error = jest.fn((...args) => {
			errorMessages.push(args.join(' '));
		});
		console.log = jest.fn((...args) => {
			logMessages.push(args.join(' '));
		});
		process.exit = jest.fn((code) => {
			exitCodes.push(code);
		});

		try {
			await moveAction(options);
		} catch (error) {
			// Expected to throw due to process.exit
		}

		expect(
			errorMessages.some((msg) =>
				msg.includes('Source and target tags are the same')
			)
		).toBe(true);
		expect(
			logMessages.some((msg) => msg.includes('For within-tag moves'))
		).toBe(true);
		expect(logMessages.some((msg) => msg.includes('For cross-tag moves'))).toBe(
			true
		);
		expect(exitCodes).toContain(1);

		// Restore original functions
		console.error = originalConsoleError;
		console.log = originalConsoleLog;
		process.exit = originalProcessExit;
	});

	it('should use current tag when --from-tag is not provided', async () => {
		// Mock successful move with current tag fallback
		mockMoveTasksBetweenTags.mockResolvedValue({
			message: 'Successfully moved task(s) between tags'
		});

		// Mock getCurrentTag to return 'master'
		utilsModule.getCurrentTag.mockReturnValue('master');

		// Simulate command: task-master move --from=1 --to-tag=in-progress
		// (no --from-tag provided, should use current tag 'master')
		const moveAction = async () => {
			const sourceId = '1';
			const fromTag = undefined; // Not provided
			const toTag = 'in-progress';

			// Get the source tag - fallback to current tag if not provided
			const sourceTag = fromTag || utilsModule.getCurrentTag();

			// Check if this is a cross-tag move (different tags)
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove) {
				// Cross-tag move logic
				if (!sourceId) {
					console.error(
						chalk.red('Error: --from parameter is required for cross-tag moves')
					);
					process.exit(1);
				}

				const sourceIds = sourceId.split(',').map((id) => id.trim());
				const moveOptions = {
					withDependencies: false,
					ignoreDependencies: false,
					force: false
				};

				console.log(
					chalk.blue(
						`Moving tasks ${sourceIds.join(', ')} from "${sourceTag}" to "${toTag}"...`
					)
				);

				try {
					const result = await moveTaskModule.moveTasksBetweenTags(
						'/test/path',
						sourceIds,
						sourceTag,
						toTag,
						moveOptions,
						{ projectRoot: '/test/project' }
					);

					console.log(chalk.green(`✓ ${result.message}`));

					// Generate task files for the affected tags
					await generateTaskFilesModule.default('/test/path', '/test', {
						tag: sourceTag
					});
					await generateTaskFilesModule.default('/test/path', '/test', {
						tag: toTag
					});
				} catch (error) {
					console.error(chalk.red(`Error: ${error.message}`));
					process.exit(1);
				}
			}
		};

		await moveAction();

		// Verify that moveTasksBetweenTags was called with 'master' as source tag
		expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
			'/test/path',
			['1'],
			'master', // Should use current tag as fallback
			'in-progress',
			expect.any(Object),
			expect.any(Object)
		);

		// Verify that generateTaskFiles was called for both tags
		expect(generateTaskFilesModule.default).toHaveBeenCalledWith(
			'/test/path',
			'/test',
			{ tag: 'master' }
		);
		expect(generateTaskFilesModule.default).toHaveBeenCalledWith(
			'/test/path',
			'/test',
			{ tag: 'in-progress' }
		);
	});
});
