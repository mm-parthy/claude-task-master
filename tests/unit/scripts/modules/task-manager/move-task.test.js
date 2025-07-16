/**
 * Move Task module tests
 */

import { jest } from '@jest/globals';
import moveTask from '../../../../../scripts/modules/task-manager/move-task.js';
import * as utils from '../../../../../scripts/modules/utils.js';

// Mock dependencies
jest.mock('path');
jest.mock('../../../../../scripts/modules/utils.js');
jest.mock('../../../../../scripts/modules/task-manager.js');
jest.mock('../../../../../scripts/modules/task-manager/generate-task-files.js', () => jest.fn());

// Mock utils module
const mockLog = jest.fn();
const mockReadJSON = jest.fn();
const mockWriteJSON = jest.fn();
const mockGetCurrentTag = jest.fn();
const mockSetTasksForTag = jest.fn();

jest.mock('../../../../../scripts/modules/utils.js', () => ({
	log: mockLog,
	readJSON: mockReadJSON,
	writeJSON: mockWriteJSON,
	getCurrentTag: mockGetCurrentTag,
	setTasksForTag: mockSetTasksForTag
}));

describe('Move Task Module', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		
		// Set default implementations
		mockGetCurrentTag.mockReturnValue('master');
		mockReadJSON.mockReturnValue({
			master: {
				tasks: []
			}
		});
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.9', '21');

			// Verify the promoted task has rewritten dependencies
			expect(mockWriteJSON).toHaveBeenCalledWith(
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
				undefined,
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21');

			// Verify task dependencies are preserved
			expect(mockWriteJSON).toHaveBeenCalledWith(
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
				undefined,
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21');

			// Verify empty dependencies array is preserved
			expect(mockWriteJSON).toHaveBeenCalledWith(
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
				undefined,
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21');

			// Verify dependencies are rewritten correctly
			expect(mockWriteJSON).toHaveBeenCalledWith(
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
				undefined,
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await moveTask('test-tasks.json', '16.2', '21');

			// Verify large numbers are preserved as task references
			expect(mockWriteJSON).toHaveBeenCalledWith(
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
				undefined,
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await expect(moveTask('test-tasks.json', '16.99', '21'))
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

			mockReadJSON.mockReturnValue({
				master: {
					tasks: mockTasks
				}
			});

			await expect(moveTask('test-tasks.json', '16.2', '21'))
				.rejects
				.toThrow('Cannot move to existing task ID 21');
		});
	});
});