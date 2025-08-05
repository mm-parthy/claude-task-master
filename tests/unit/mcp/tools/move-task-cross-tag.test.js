import { jest } from '@jest/globals';
import { moveTaskCrossTagDirect } from '../../../../mcp-server/src/core/direct-functions/move-task-cross-tag.js';

// Mock the core moveTasksBetweenTags function
const mockMoveTasksBetweenTags = jest.fn();
jest.mock('../../../../scripts/modules/task-manager/move-task.js', () => ({
	moveTasksBetweenTags: mockMoveTasksBetweenTags
}));

// Mock the utils functions
const mockFindTasksPath = jest
	.fn()
	.mockReturnValue('/test/path/.taskmaster/tasks/tasks.json');
jest.mock('../../../../mcp-server/src/core/utils/path-utils.js', () => ({
	findTasksPath: mockFindTasksPath
}));

const mockEnableSilentMode = jest.fn();
const mockDisableSilentMode = jest.fn();
jest.mock('../../../../scripts/modules/utils.js', () => ({
	enableSilentMode: mockEnableSilentMode,
	disableSilentMode: mockDisableSilentMode
}));

describe('MCP Cross-Tag Move Direct Function', () => {
	const mockLog = {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn()
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Parameter Validation', () => {
		it('should return error when source IDs are missing', async () => {
			const result = await moveTaskCrossTagDirect(
				{
					sourceTag: 'backlog',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('MISSING_SOURCE_IDS');
			expect(result.error.message).toBe('Source IDs are required');
		});

		it('should return error when source tag is missing', async () => {
			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1,2',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('MISSING_SOURCE_TAG');
			expect(result.error.message).toBe(
				'Source tag is required for cross-tag moves'
			);
		});

		it('should return error when target tag is missing', async () => {
			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1,2',
					sourceTag: 'backlog',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('MISSING_TARGET_TAG');
			expect(result.error.message).toBe(
				'Target tag is required for cross-tag moves'
			);
		});

		it('should return error when source and target tags are the same', async () => {
			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1,2',
					sourceTag: 'backlog',
					targetTag: 'backlog',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('SAME_SOURCE_TARGET_TAG');
			expect(result.error.message).toBe(
				'Source and target tags are the same ("backlog")'
			);
			expect(result.error.suggestions).toHaveLength(3);
		});
	});

	describe('Error Code Mapping', () => {
		it('should map cross-tag dependency conflict errors correctly', async () => {
			const error = new Error('cross-tag dependency conflicts found');
			mockMoveTasksBetweenTags.mockRejectedValue(error);

			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1',
					sourceTag: 'backlog',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('CROSS_TAG_DEPENDENCY_CONFLICT');
			expect(result.error.message).toBe('cross-tag dependency conflicts found');
			expect(result.error.suggestions).toHaveLength(4);
		});

		it('should map subtask movement restriction errors correctly', async () => {
			const error = new Error('Cannot move subtask 5.2 directly between tags');
			mockMoveTasksBetweenTags.mockRejectedValue(error);

			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '5.2',
					sourceTag: 'backlog',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('SUBTASK_MOVE_RESTRICTION');
			expect(result.error.message).toBe(
				'Cannot move subtask 5.2 directly between tags'
			);
			expect(result.error.suggestions).toHaveLength(2);
		});

		it('should map tag not found errors correctly', async () => {
			const error = new Error('Source tag "invalid" not found or invalid');
			mockMoveTasksBetweenTags.mockRejectedValue(error);

			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1',
					sourceTag: 'invalid',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('TAG_OR_TASK_NOT_FOUND');
			expect(result.error.message).toBe(
				'Source tag "invalid" not found or invalid'
			);
			expect(result.error.suggestions).toHaveLength(3);
		});

		it('should map generic errors correctly', async () => {
			const error = new Error('Generic error occurred');
			mockMoveTasksBetweenTags.mockRejectedValue(error);

			const result = await moveTaskCrossTagDirect(
				{
					sourceIds: '1',
					sourceTag: 'backlog',
					targetTag: 'in-progress',
					projectRoot: '/test'
				},
				mockLog
			);

			expect(result.success).toBe(false);
			expect(result.error.code).toBe('MOVE_TASK_CROSS_TAG_ERROR');
			expect(result.error.message).toBe('Generic error occurred');
			expect(result.error.suggestions).toHaveLength(0);
		});
	});

	describe('Move Options Handling', () => {
		it('should pass move options correctly to core function', async () => {
			const mockResult = {
				message: 'Successfully moved 1 task from "backlog" to "in-progress"',
				movedTasks: [{ id: 1, fromTag: 'backlog', toTag: 'in-progress' }]
			};

			mockMoveTasksBetweenTags.mockResolvedValue(mockResult);

			await moveTaskCrossTagDirect(
				{
					sourceIds: '1',
					sourceTag: 'backlog',
					targetTag: 'in-progress',
					withDependencies: true,
					ignoreDependencies: false,
					force: true,
					projectRoot: '/test'
				},
				mockLog
			);

			// Verify the mock was called with correct options
			expect(mockMoveTasksBetweenTags).toHaveBeenCalledWith(
				expect.any(String), // tasksPath
				['1'], // sourceIds
				'backlog', // sourceTag
				'in-progress', // targetTag
				{
					withDependencies: true,
					ignoreDependencies: false,
					force: true
				}, // moveOptions
				{ projectRoot: '/test' } // context
			);
		});
	});
});
