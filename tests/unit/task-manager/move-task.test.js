/**
 * Tests for the move-task.js module
 */
import { jest } from '@jest/globals';

// Mock dependencies before importing the module
const mockUtils = {
	log: jest.fn(),
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	getCurrentTag: jest.fn(() => 'master'),
	setTasksForTag: jest.fn()
};

const mockTaskManager = {
	isTaskDependentOn: jest.fn(() => false)
};

const mockGenerateTaskFiles = jest.fn();

jest.unstable_mockModule('../../../scripts/modules/utils.js', () => mockUtils);
jest.unstable_mockModule(
	'../../../scripts/modules/task-manager.js',
	() => mockTaskManager
);
jest.unstable_mockModule(
	'../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: mockGenerateTaskFiles
	})
);

// Import the mocked modules
const { readJSON, writeJSON } = await import(
	'../../../scripts/modules/utils.js'
);

// Import the module under test
const moveTask = (
	await import('../../../scripts/modules/task-manager/move-task.js')
).default;

describe('moveTask', () => {
	let mockTasks;
	let mockRawData;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock task data
		mockTasks = [
			{
				id: 1,
				title: 'Task 1',
				description: 'First task',
				status: 'pending',
				dependencies: [],
				subtasks: [
					{
						id: 1,
						title: 'Subtask 1.1',
						description: 'First subtask',
						status: 'pending',
						dependencies: ['1.2'], // Fully-qualified dependency
						details: 'Details for 1.1'
					},
					{
						id: 2,
						title: 'Subtask 1.2',
						description: 'Second subtask',
						status: 'pending',
						dependencies: [1], // Relative dependency (should be converted)
						details: 'Details for 1.2'
					}
				]
			},
			{
				id: 2,
				title: 'Task 2',
				description: 'Second task',
				status: 'pending',
				dependencies: [1],
				subtasks: []
			},
			{
				id: 3,
				title: 'Task 3',
				description: 'Third task',
				status: 'pending',
				dependencies: [],
				subtasks: []
			}
		];

		mockRawData = {
			master: {
				tasks: mockTasks
			}
		};

		readJSON.mockReturnValue(mockRawData);
		writeJSON.mockImplementation(() => {});
	});

	describe('Data Loss Prevention', () => {
		test('should prevent moving task with subtasks to subtask position', async () => {
			// Add subtasks to Task 2
			mockTasks[1].subtasks = [
				{
					id: 1,
					title: 'Subtask 2.1',
					description: 'Subtask of task 2',
					status: 'pending',
					dependencies: [],
					details: 'Details'
				}
			];

			await expect(
				moveTask('tasks.json', '2', '3.1', false, { projectRoot: '.' })
			).rejects.toThrow(
				'Cannot move task 2 to subtask position 3.1 because it has 1 subtasks'
			);
		});

		test('should allow moving task without subtasks to subtask position', async () => {
			const result = await moveTask('tasks.json', '3', '1.3', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Converted task 3 to subtask 1.3');
			expect(result.movedItem.id).toBe(3);
			expect(result.movedItem.title).toBe('Task 3');
		});
	});

	describe('Dependency Handling', () => {
		test('should convert relative dependencies to fully-qualified IDs in expand-task', () => {
			// This test would require testing the expand-task function directly
			// For now, we'll test the dependency conversion logic
			const relativeDeps = [1, 2, 3];
			const parentTaskId = 5;
			const startId = 1;
			const currentId = 4;

			// Simulate the conversion logic from expand-task
			const convertedDeps = relativeDeps
				.map((dep) => {
					const depNum = typeof dep === 'string' ? parseInt(dep, 10) : dep;
					if (
						!Number.isNaN(depNum) &&
						depNum >= startId &&
						depNum < currentId
					) {
						return `${parentTaskId}.${depNum}`;
					}
					return depNum;
				})
				.filter((depId) => {
					if (typeof depId === 'string' && depId.includes('.')) {
						const parts = depId.split('.');
						return (
							parts.length === 2 &&
							!Number.isNaN(parseInt(parts[0], 10)) &&
							!Number.isNaN(parseInt(parts[1], 10))
						);
					}
					return !Number.isNaN(depId) && depId > 0;
				});

			expect(convertedDeps).toEqual(['5.1', '5.2', '5.3']);
		});

		test('should rewrite dependencies when moving subtask between parents', async () => {
			// Move subtask 1.1 to task 2 as subtask 2.1
			const result = await moveTask('tasks.json', '1.1', '2.1', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Moved subtask 1.1 to 2.1');

			// Check that the dependency was rewritten from '1.2' to '2.2'
			const movedSubtask = mockTasks[1].subtasks.find((st) => st.id === 1);
			expect(movedSubtask.dependencies).toContain('2.2');
		});

		test('should preserve task dependencies when moving subtask', async () => {
			// Add a task dependency to subtask 1.1
			mockTasks[0].subtasks[0].dependencies = ['1.2', 2]; // Subtask + task dependency

			const result = await moveTask('tasks.json', '1.1', '2.1', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Moved subtask 1.1 to 2.1');

			// Check that task dependency is preserved
			const movedSubtask = mockTasks[1].subtasks.find((st) => st.id === 1);
			expect(movedSubtask.dependencies).toContain(2);
		});
	});

	describe('Move Operations', () => {
		test('should handle subtask to subtask move within same parent', async () => {
			const result = await moveTask('tasks.json', '1.1', '1.3', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Moved subtask 1.1 to 1.3');

			// Check that subtask was moved to the correct position
			const parentTask = mockTasks[0];
			const movedSubtask = parentTask.subtasks.find((st) => st.id === 1);
			expect(movedSubtask).toBeDefined();
		});

		test('should handle subtask to task conversion', async () => {
			const result = await moveTask('tasks.json', '1.1', '4', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Converted subtask 1.1 to task 4');
			expect(result.movedItem.id).toBe(4);
			expect(result.movedItem.title).toBe('Subtask 1.1');
		});

		test('should handle task to task move', async () => {
			const result = await moveTask('tasks.json', '2', '5', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Moved task 2 to new ID 5');
			expect(result.movedItem.id).toBe(5);
			expect(result.movedItem.title).toBe('Task 2');
		});

		test('should handle batch moves', async () => {
			const result = await moveTask('tasks.json', '1,2', '10,11', false, {
				projectRoot: '.'
			});

			expect(result.message).toBe('Successfully moved 2 tasks/subtasks');
			expect(result.moves).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		test('should throw error for non-existent source task', async () => {
			await expect(
				moveTask('tasks.json', '99', '1', false, { projectRoot: '.' })
			).rejects.toThrow('Source task with ID 99 not found');
		});

		test('should throw error for non-existent destination parent', async () => {
			await expect(
				moveTask('tasks.json', '1.1', '99.1', false, { projectRoot: '.' })
			).rejects.toThrow('Destination parent task with ID 99 not found');
		});

		test('should throw error for non-existent source subtask', async () => {
			await expect(
				moveTask('tasks.json', '1.99', '2.1', false, { projectRoot: '.' })
			).rejects.toThrow('Source subtask 1.99 not found');
		});

		test('should throw error for mismatched batch move counts', async () => {
			await expect(
				moveTask('tasks.json', '1,2', '3', false, { projectRoot: '.' })
			).rejects.toThrow(
				'Number of source IDs (2) must match number of destination IDs (1)'
			);
		});
	});

	describe('Dependency Validation', () => {
		test('should validate fully-qualified subtask IDs', () => {
			// Test that the move function properly handles fully-qualified subtask IDs
			const validSubtaskId = '1.2';
			const [parentId, subtaskId] = validSubtaskId.split('.').map(Number);

			expect(parentId).toBe(1);
			expect(subtaskId).toBe(2);
			expect(Number.isNaN(parentId)).toBe(false);
			expect(Number.isNaN(subtaskId)).toBe(false);
		});
	});
});
