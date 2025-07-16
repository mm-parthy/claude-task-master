/**
 * Move Task module tests
 */

import { jest } from '@jest/globals';
import moveTask from '../../../../../scripts/modules/task-manager/move-task.js';
import { readJSON, writeJSON, log, getCurrentTag, setTasksForTag } from '../../../../../scripts/modules/utils.js';

// Mock dependencies
jest.mock('path');
jest.mock('../../../../../scripts/modules/utils.js', () => ({
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn(),
	getCurrentTag: jest.fn(() => 'master'),
	setTasksForTag: jest.fn()
}));
jest.mock('../../../../../scripts/modules/task-manager.js');
jest.mock('../../../../../scripts/modules/task-manager/generate-task-files.js', () => jest.fn());

	describe('Move Task Module', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

	describe('Subtask to Task Promotion', () => {
		test('should rewrite sibling subtask dependencies to parent task references', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [1] }, // Sibling subtask dependency
						{ id: 3, dependencies: [2, 15] }, // Mix of sibling and task dependencies
						{ id: 9, dependencies: ['16.1', 20] } // Mix of fully-qualified and task dependencies
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.9', '21', false, { projectRoot: '/test' });

			// Verify the promoted task has rewritten dependencies
			expect(writeJSON).toHaveBeenCalledWith(
				'test-tasks.json',
				expect.objectContaining({
					master: {
						tasks: expect.arrayContaining([
							expect.objectContaining({
								id: 21,
								dependencies: [16, 20] // 16.1 -> 16, 20 stays as task reference
							})
						])
					}
				}),
				'/test',
				'master'
			);
		});

		test('should preserve task dependencies when promoting subtask', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [15, 20] } // Only task dependencies
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21', false, { projectRoot: '/test' });

			// Verify task dependencies are preserved
			expect(writeJSON).toHaveBeenCalledWith(
				'test-tasks.json',
				expect.objectContaining({
					master: {
						tasks: expect.arrayContaining([
							expect.objectContaining({
								id: 21,
								dependencies: [15, 20] // Unchanged
							})
						])
					}
				}),
				'/test',
				'master'
			);
		});

		test('should handle subtask with no dependencies', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [] } // No dependencies
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21', false, { projectRoot: '/test' });

			// Verify empty dependencies array is preserved
			expect(writeJSON).toHaveBeenCalledWith(
				'test-tasks.json',
				expect.objectContaining({
					master: {
						tasks: expect.arrayContaining([
							expect.objectContaining({
								id: 21,
								dependencies: [] // Empty array
							})
						])
					}
				}),
				'/test',
				'master'
			);
		});

		test('should handle mixed dependency types correctly', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [1, 15, '16.3', 25] }, // Mix of all types
						{ id: 3, dependencies: [] }
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21', false, { projectRoot: '/test' });

			// Verify dependencies are rewritten correctly
			expect(writeJSON).toHaveBeenCalledWith(
				'test-tasks.json',
				expect.objectContaining({
					master: {
						tasks: expect.arrayContaining([
							expect.objectContaining({
								id: 21,
								dependencies: [16, 15, 16, 25] // 1->16, 15->15, 16.3->16, 25->25
							})
						])
					}
				}),
				'/test',
				'master'
			);
		});

		test('should handle large numbers as task references', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [10, 15, 20] } // Large numbers (task references)
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21', false, { projectRoot: '/test' });

			// Verify large numbers are preserved as task references
			expect(writeJSON).toHaveBeenCalledWith(
				'test-tasks.json',
				expect.objectContaining({
					master: {
						tasks: expect.arrayContaining([
							expect.objectContaining({
								id: 21,
								dependencies: [10, 15, 20] // Unchanged
							})
						])
					}
				}),
				'/test',
				'master'
			);
		});
	});

	describe('Error Handling', () => {
		test('should throw error when source subtask does not exist', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] }
					]
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await expect(moveTask('test-tasks.json', '16.99', '21', false, { projectRoot: '/test' }))
				.rejects
				.toThrow('Source subtask 16.99 not found');
		});

		test('should throw error when destination task already exists', async () => {
			const mockTasks = [
				{
					id: 16,
					dependencies: [],
					subtasks: [
						{ id: 1, dependencies: [] },
						{ id: 2, dependencies: [] }
					]
				},
				{
					id: 21,
					dependencies: [],
					subtasks: []
				}
			];

			readJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await expect(moveTask('test-tasks.json', '16.2', '21', false, { projectRoot: '/test' }))
				.rejects
				.toThrow('Cannot move to existing task ID 21');
		});
	});
});