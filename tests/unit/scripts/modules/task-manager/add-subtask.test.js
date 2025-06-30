/**
 * Tests for the addSubtask function
 */
import { jest } from '@jest/globals';

// Mock dependencies before importing the module
const mockUtils = {
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn()
};
const mockTaskManager = {
	isTaskDependentOn: jest.fn()
};
const mockGenerateTaskFiles = jest.fn();

jest.unstable_mockModule('../../../../../scripts/modules/utils.js', () => mockUtils);
jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager.js',
	() => mockTaskManager
);
jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: mockGenerateTaskFiles
	})
);

const addSubtask = (
	await import('../../../../../scripts/modules/task-manager/add-subtask.js')
).default;

describe('addSubtask function', () => {
	const multiTagData = {
		master: {
			tasks: [{ id: 1, title: 'Master Task', subtasks: [] }],
			metadata: { description: 'Master tasks' }
		},
		'feature-branch': {
			tasks: [{ id: 1, title: 'Feature Task', subtasks: [] }],
			metadata: { description: 'Feature tasks' }
		}
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUtils.readJSON.mockReturnValue(JSON.parse(JSON.stringify(multiTagData)));
		mockTaskManager.isTaskDependentOn.mockReturnValue(false);
	});

	test('should add a new subtask and preserve other tags', async () => {
		const context = { projectRoot: '/fake/root', tag: 'feature-branch' };
		const newSubtaskData = { title: 'My New Subtask' };

		await addSubtask(
			'tasks.json',
			'1',
			null,
			newSubtaskData,
			true,
			context
		);

		expect(mockUtils.writeJSON).toHaveBeenCalledWith(
			'tasks.json',
			expect.any(Object),
			'/fake/root',
			'feature-branch'
		);
		const writtenData = mockUtils.writeJSON.mock.calls[0][1];
		const parentTask = writtenData['feature-branch'].tasks.find(
			(t) => t.id === 1
		);
		expect(parentTask.subtasks).toHaveLength(1);
		expect(parentTask.subtasks[0].title).toBe('My New Subtask');
		expect(writtenData.master).toBeDefined(); // Check that master tag is preserved
	});

	test('should add a new subtask to a parent task', async () => {
		const newSubtask = await addSubtask('1', 'New Subtask', {
			generateFiles: true
		});
		expect(newSubtask).toBeDefined();
		expect(newSubtask.id).toBe('1.1');
		expect(mockUtils.writeJSON).toHaveBeenCalled();
		const writeCallArgs = mockUtils.writeJSON.mock.calls[0][1]; // data is the second arg now
		const parentTask = writeCallArgs.tasks.find((t) => t.id === 1);
		expect(parentTask.subtasks).toHaveLength(1);
		expect(parentTask.subtasks[0].title).toBe('New Subtask');
		expect(mockGenerateTaskFiles).toHaveBeenCalled();
	});

	test('should convert an existing task to a subtask', async () => {
		const convertedSubtask = await addSubtask('1', null, '2');
		expect(convertedSubtask.id).toBe('1.1');
		expect(convertedSubtask.title).toBe('Existing Task 2');
		expect(mockUtils.writeJSON).toHaveBeenCalled();
		const writeCallArgs = mockUtils.writeJSON.mock.calls[0][1];
		const parentTask = writeCallArgs.tasks.find((t) => t.id === 1);
		expect(parentTask.subtasks).toHaveLength(1);
		expect(parentTask.subtasks[0].title).toBe('Existing Task 2');
	});

	test('should throw an error if parent task does not exist', async () => {
		expect(addSubtask('99', 'New Subtask')).rejects.toThrow(
			'Parent task with ID 99 not found.'
		);
	});

	test('should throw an error if trying to convert a non-existent task', async () => {
		await expect(addSubtask('1', null, '99')).rejects.toThrow(
			'Task with ID 99 not found.'
		);
	});

	test('should throw an error for circular dependency', async () => {
		mockTaskManager.isTaskDependentOn.mockReturnValue(true);
		await expect(
			addSubtask('1', 'New Subtask', null, 'Circular Subtask', 'details', [
				1
			])
		).rejects.toThrow('Circular dependency detected.');
	});
});
