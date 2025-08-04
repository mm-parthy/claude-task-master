import { jest } from '@jest/globals';

// --- Mocks ---
jest.unstable_mockModule('../../../../../scripts/modules/utils.js', () => ({
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn(),
	setTasksForTag: jest.fn(),
	truncate: jest.fn((t) => t),
	isSilentMode: jest.fn(() => false),
	findProjectRoot: jest.fn(() => '/test/project/root'),
	isEmpty: jest.fn(() => false),
	getCurrentTag: jest.fn(() => 'master'),
	enableSilentMode: jest.fn(),
	disableSilentMode: jest.fn(),
	resolveEnvVariable: jest.fn(() => 'test-value'),
	findTaskById: jest.fn(() => ({ id: 1, title: 'Task' })),
	taskExists: jest.fn(() => true),
	findCycles: jest.fn(() => []),
	validateTaskId: jest.fn(() => true)
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
		isTaskDependentOn: jest.fn(() => false),
		analyzeTaskComplexity: jest.fn(() => ({ complexity: 5 })),
		findNextTask: jest.fn(() => ({ id: 1, title: 'Next Task' })),
		listTasks: jest.fn(() => []),
		showTask: jest.fn(() => ({ id: 1, title: 'Task' })),
		addTask: jest.fn(() => ({ id: 1, title: 'New Task' })),
		updateTask: jest.fn(() => ({ id: 1, title: 'Updated Task' })),
		expandTask: jest.fn(() => ({ id: 1, subtasks: [] })),
		setTaskStatus: jest.fn(() => ({ id: 1, status: 'done' })),
		removeTask: jest.fn(() => ({ id: 1, removed: true })),
		addSubtask: jest.fn(() => ({ id: 1, subtask: { id: 1.1 } })),
		removeSubtask: jest.fn(() => ({ id: 1, subtaskRemoved: true })),
		clearSubtasks: jest.fn(() => ({ id: 1, cleared: true })),
		addDependency: jest.fn(() => ({ id: 1, dependency: 2 })),
		removeDependency: jest.fn(() => ({ id: 1, dependencyRemoved: 2 })),
		validateDependencies: jest.fn(() => ({ valid: true })),
		fixDependencies: jest.fn(() => ({ fixed: true })),
		parsePRD: jest.fn(() => ({ tasks: [] })),
		generateTaskFiles: jest.fn(() => ({ generated: true })),
		performResearch: jest.fn(() => ({ research: 'results' }))
	})
);

// fs not needed since move-task uses writeJSON

const { readJSON, writeJSON, log } = await import(
	'../../../../../scripts/modules/utils.js'
);
const generateTaskFiles = (
	await import(
		'../../../../../scripts/modules/task-manager/generate-task-files.js'
	)
).default;

const { default: moveTask } = await import(
	'../../../../../scripts/modules/task-manager/move-task.js'
);

const sampleTagged = () => ({
	master: {
		tasks: [
			{ id: 1, title: 'A' },
			{ id: 2, title: 'B', subtasks: [{ id: 1, title: 'B.1' }] }
		],
		metadata: {}
	},
	feature: {
		tasks: [{ id: 10, title: 'X' }],
		metadata: {}
	}
});

const clone = () => JSON.parse(JSON.stringify(sampleTagged()));

describe('moveTask (unit)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		readJSON.mockImplementation((path, projectRoot, tag) => {
			const data = clone();
			return { ...data[tag], tag, _rawTaggedData: data };
		});
		writeJSON.mockResolvedValue();
		log.mockImplementation(() => {});
	});

	test('moves task to new ID in same tag', async () => {
		await moveTask('tasks.json', '1', '3', false, { tag: 'master' });
		expect(writeJSON).toHaveBeenCalled();
		const written = writeJSON.mock.calls[0][1];
		const ids = written.master.tasks.map((t) => t.id);
		expect(ids).toEqual(expect.arrayContaining([2, 3]));
		expect(ids).not.toContain(1);
	});

	test('throws when counts of source and dest mismatch', async () => {
		await expect(
			moveTask('tasks.json', '1,2', '3', {}, { tag: 'master' })
		).rejects.toThrow(/Number of source IDs/);
	});

	test('batch move calls generateTaskFiles once when flag true', async () => {
		await moveTask('tasks.json', '1,2', '3,4', true, { tag: 'master' });
		expect(generateTaskFiles).toHaveBeenCalledTimes(1);
	});

	test('error when tag invalid', async () => {
		await expect(
			moveTask('tasks.json', '1', '2', false, { tag: 'ghost' })
		).rejects.toThrow(/tag "ghost" not found/);
	});
});
