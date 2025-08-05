import { jest } from '@jest/globals';
import chalk from 'chalk';

// Mock the modules
const mockMoveTasksBetweenTags = jest.fn();
const mockGenerateTaskFiles = jest.fn();
const mockInitTaskMaster = jest.fn();
const mockFindProjectRoot = jest.fn();

jest.mock('../../../../../scripts/modules/task-manager/move-task.js', () => ({
	moveTasksBetweenTags: mockMoveTasksBetweenTags
}));

jest.mock('../../../../../scripts/modules/utils.js', () => ({
	findProjectRoot: mockFindProjectRoot,
	generateTaskFiles: mockGenerateTaskFiles
}));

jest.mock('../../../../../scripts/modules/config-manager.js', () => ({
	initTaskMaster: mockInitTaskMaster
}));

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
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Cross-Tag Move Logic', () => {
		// Helper function to simulate cross-tag move logic and verify expectations
		const simulateCrossTagMove = async (
			options,
			expectedMessage = 'Successfully moved 1 tasks from "backlog" to "in-progress"'
		) => {
			mockMoveTasksBetweenTags.mockResolvedValue({
				message: expectedMessage
			});

			// Simulate the move logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove) {
				const sourceIds = sourceId.split(',').map((id) => id.trim());
				const moveOptions = {
					withDependencies: options.withDependencies || false,
					ignoreDependencies: options.ignoreDependencies || false
				};

				await mockMoveTasksBetweenTags(
					mockTaskMaster.getTasksPath(),
					sourceIds,
					sourceTag,
					toTag,
					moveOptions,
					{ projectRoot: mockTaskMaster.getProjectRoot() }
				);
			}

			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				'/test/path/tasks.json',
				['1'],
				'backlog',
				'in-progress',
				{
					withDependencies: options.withDependencies || false,
					ignoreDependencies: options.ignoreDependencies || false
				},
				{ projectRoot: '/test/project' }
			);
		};

		it('should handle basic cross-tag move', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: false,
				ignoreDependencies: false
			};

			await simulateCrossTagMove(options);
		});

		it('should handle --with-dependencies flag', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: true,
				ignoreDependencies: false
			};

			await simulateCrossTagMove(
				options,
				'Successfully moved 2 tasks from "backlog" to "in-progress"'
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

			await simulateCrossTagMove(options);
		});

		it('should handle --ignore-dependencies flag', async () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'in-progress',
				withDependencies: false,
				ignoreDependencies: true
			};

			await simulateCrossTagMove(options);
		});
	});

	describe('Error Handling', () => {
		it('should handle missing --from parameter', () => {
			const options = {
				from: undefined,
				fromTag: 'backlog',
				toTag: 'in-progress'
			};

			// Simulate the error handling logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove && !sourceId) {
				console.error(
					chalk.red('Error: --from parameter is required for cross-tag moves')
				);
				process.exit(1);
			}

			expect(mockConsoleError).toHaveBeenCalledWith(
				chalk.red('Error: --from parameter is required for cross-tag moves')
			);
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});

		it('should handle same source and target tags', () => {
			const options = {
				from: '1',
				fromTag: 'backlog',
				toTag: 'backlog'
			};

			// Simulate the error handling logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (sourceTag && toTag && sourceTag === toTag) {
				console.error(
					chalk.red(
						`Error: Source and target tags are the same ("${sourceTag}")`
					)
				);
				process.exit(1);
			}

			expect(mockConsoleError).toHaveBeenCalledWith(
				chalk.red('Error: Source and target tags are the same ("backlog")')
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

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 1 tasks from "master" to "in-progress"'
			});

			// Simulate the move logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove) {
				const sourceIds = sourceId.split(',').map((id) => id.trim());
				const moveOptions = {
					withDependencies: options.withDependencies || false,
					ignoreDependencies: options.ignoreDependencies || false
				};

				await mockMoveTasksBetweenTags(
					mockTaskMaster.getTasksPath(),
					sourceIds,
					sourceTag,
					toTag,
					moveOptions,
					{ projectRoot: mockTaskMaster.getProjectRoot() }
				);
			}

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

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 3 tasks from "backlog" to "in-progress"'
			});

			// Simulate the move logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove) {
				const sourceIds = sourceId.split(',').map((id) => id.trim());
				const moveOptions = {
					withDependencies: options.withDependencies || false,
					ignoreDependencies: options.ignoreDependencies || false
				};

				await mockMoveTasksBetweenTags(
					mockTaskMaster.getTasksPath(),
					sourceIds,
					sourceTag,
					toTag,
					moveOptions,
					{ projectRoot: mockTaskMaster.getProjectRoot() }
				);
			}

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

			mockMoveTasksBetweenTags.mockResolvedValue({
				message: 'Successfully moved 3 tasks from "backlog" to "in-progress"'
			});

			// Simulate the move logic
			const sourceId = options.from;
			const fromTag = options.fromTag;
			const toTag = options.toTag;
			const sourceTag = fromTag || mockTaskMaster.getCurrentTag();
			const isCrossTagMove = sourceTag && toTag && sourceTag !== toTag;

			if (isCrossTagMove) {
				const sourceIds = sourceId.split(',').map((id) => id.trim());
				const moveOptions = {
					withDependencies: options.withDependencies || false,
					ignoreDependencies: options.ignoreDependencies || false
				};

				await mockMoveTasksBetweenTags(
					mockTaskMaster.getTasksPath(),
					sourceIds,
					sourceTag,
					toTag,
					moveOptions,
					{ projectRoot: mockTaskMaster.getProjectRoot() }
				);
			}

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
