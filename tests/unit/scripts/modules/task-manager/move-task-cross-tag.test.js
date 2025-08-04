import { jest } from '@jest/globals';

// --- Mocks ---
jest.unstable_mockModule('../../../../../scripts/modules/utils.js', () => ({
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn(),
	setTasksForTag: jest.fn(),
	truncate: jest.fn((t) => t),
	isSilentMode: jest.fn(() => false)
}));

jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: jest.fn().mockResolvedValue()
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager.js',
	() => ({
		isTaskDependentOn: jest.fn(() => false)
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/dependency-manager.js',
	() => ({
		validateCrossTagMove: jest.fn(),
		findCrossTagDependencies: jest.fn(),
		getDependentTaskIds: jest.fn(),
		validateSubtaskMove: jest.fn()
	})
);

const { readJSON, writeJSON, log } = await import(
	'../../../../../scripts/modules/utils.js'
);

const {
	validateCrossTagMove,
	findCrossTagDependencies,
	getDependentTaskIds,
	validateSubtaskMove
} = await import('../../../../../scripts/modules/dependency-manager.js');

const { moveTasksBetweenTags, getAllTasksWithTags } = await import(
	'../../../../../scripts/modules/task-manager/move-task.js'
);

describe('Cross-Tag Task Movement', () => {
	let mockRawData;
	let mockTasksPath;
	let mockContext;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock data
		mockRawData = {
			backlog: {
				tasks: [
					{ id: 1, title: 'Task 1', dependencies: [2] },
					{ id: 2, title: 'Task 2', dependencies: [] },
					{ id: 3, title: 'Task 3', dependencies: [1] }
				]
			},
			'in-progress': {
				tasks: [{ id: 4, title: 'Task 4', dependencies: [] }]
			},
			done: {
				tasks: [{ id: 5, title: 'Task 5', dependencies: [4] }]
			}
		};

		mockTasksPath = '/test/path/tasks.json';
		mockContext = { projectRoot: '/test/project' };

		// Mock readJSON to return our test data
		readJSON.mockImplementation((path, projectRoot, tag) => {
			return { ...mockRawData[tag], tag, _rawTaggedData: mockRawData };
		});

		writeJSON.mockResolvedValue();
		log.mockImplementation(() => {});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getAllTasksWithTags', () => {
		it('should return all tasks with tag information', () => {
			const allTasks = getAllTasksWithTags(mockRawData);

			expect(allTasks).toHaveLength(5);
			expect(allTasks.find((t) => t.id === 1).tag).toBe('backlog');
			expect(allTasks.find((t) => t.id === 4).tag).toBe('in-progress');
			expect(allTasks.find((t) => t.id === 5).tag).toBe('done');
		});
	});

	describe('validateCrossTagMove', () => {
		it('should allow move when no dependencies exist', () => {
			const task = { id: 2, dependencies: [] };
			const allTasks = getAllTasksWithTags(mockRawData);

			validateCrossTagMove.mockReturnValue({ canMove: true, conflicts: [] });
			const result = validateCrossTagMove(
				task,
				'backlog',
				'in-progress',
				allTasks
			);

			expect(result.canMove).toBe(true);
			expect(result.conflicts).toHaveLength(0);
		});

		it('should block move when cross-tag dependencies exist', () => {
			const task = { id: 1, dependencies: [2] };
			const allTasks = getAllTasksWithTags(mockRawData);

			validateCrossTagMove.mockReturnValue({
				canMove: false,
				conflicts: [{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' }]
			});
			const result = validateCrossTagMove(
				task,
				'backlog',
				'in-progress',
				allTasks
			);

			expect(result.canMove).toBe(false);
			expect(result.conflicts).toHaveLength(1);
			expect(result.conflicts[0].dependencyId).toBe(2);
		});
	});

	describe('findCrossTagDependencies', () => {
		it('should find cross-tag dependencies for multiple tasks', () => {
			const sourceTasks = [
				{ id: 1, dependencies: [2] },
				{ id: 3, dependencies: [1] }
			];
			const allTasks = getAllTasksWithTags(mockRawData);

			findCrossTagDependencies.mockReturnValue([
				{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' },
				{ taskId: 3, dependencyId: 1, dependencyTag: 'backlog' }
			]);
			const conflicts = findCrossTagDependencies(
				sourceTasks,
				'backlog',
				'in-progress',
				allTasks
			);

			expect(conflicts).toHaveLength(2);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 2)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 3 && c.dependencyId === 1)
			).toBe(true);
		});
	});

	describe('getDependentTaskIds', () => {
		it('should return dependent task IDs', () => {
			const sourceTasks = [{ id: 1, dependencies: [2] }];
			const crossTagDependencies = [
				{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' }
			];
			const allTasks = getAllTasksWithTags(mockRawData);

			getDependentTaskIds.mockReturnValue([2]);
			const dependentTaskIds = getDependentTaskIds(
				sourceTasks,
				crossTagDependencies,
				allTasks
			);

			expect(dependentTaskIds).toContain(2);
		});
	});

	describe('moveTasksBetweenTags', () => {
		it('should move tasks without dependencies successfully', async () => {
			// Mock the dependency functions to return no conflicts
			findCrossTagDependencies.mockReturnValue([]);
			validateSubtaskMove.mockImplementation(() => {});

			const result = await moveTasksBetweenTags(
				mockTasksPath,
				[2],
				'backlog',
				'in-progress',
				{},
				mockContext
			);

			expect(result.message).toContain('Successfully moved 1 tasks');
			expect(writeJSON).toHaveBeenCalled();
		});

		it('should throw error for cross-tag dependencies by default', async () => {
			findCrossTagDependencies.mockReturnValue([
				{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' }
			]);
			validateSubtaskMove.mockImplementation(() => {});

			await expect(
				moveTasksBetweenTags(
					mockTasksPath,
					[1],
					'backlog',
					'in-progress',
					{},
					mockContext
				)
			).rejects.toThrow('cross-tag dependency conflicts');
		});

		it('should move with dependencies when --with-dependencies is used', async () => {
			findCrossTagDependencies.mockReturnValue([
				{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' }
			]);
			getDependentTaskIds.mockReturnValue([2]);
			validateSubtaskMove.mockImplementation(() => {});

			const result = await moveTasksBetweenTags(
				mockTasksPath,
				[1],
				'backlog',
				'in-progress',
				{ withDependencies: true },
				mockContext
			);

			expect(result.message).toContain('Successfully moved');
			expect(writeJSON).toHaveBeenCalled();
		});

		it('should break dependencies when --ignore-dependencies is used', async () => {
			findCrossTagDependencies.mockReturnValue([
				{ taskId: 1, dependencyId: 2, dependencyTag: 'backlog' }
			]);
			validateSubtaskMove.mockImplementation(() => {});

			const result = await moveTasksBetweenTags(
				mockTasksPath,
				[2],
				'backlog',
				'in-progress',
				{ ignoreDependencies: true },
				mockContext
			);

			expect(result.message).toContain('Successfully moved');
			expect(writeJSON).toHaveBeenCalled();
		});

		it('should create target tag if it does not exist', async () => {
			findCrossTagDependencies.mockReturnValue([]);
			validateSubtaskMove.mockImplementation(() => {});

			const result = await moveTasksBetweenTags(
				mockTasksPath,
				[2],
				'backlog',
				'new-tag',
				{},
				mockContext
			);

			expect(result.message).toContain('Successfully moved');
			expect(writeJSON).toHaveBeenCalled();
		});

		it('should throw error for subtask movement', async () => {
			validateSubtaskMove.mockImplementation(() => {
				throw new Error('Cannot move subtask 1.2 directly between tags');
			});

			await expect(
				moveTasksBetweenTags(
					mockTasksPath,
					['1.2'],
					'backlog',
					'in-progress',
					{},
					mockContext
				)
			).rejects.toThrow('Cannot move subtask');
		});
	});
});
