import { jest } from '@jest/globals';
import {
	displayCrossTagDependencyError,
	displaySubtaskMoveError,
	displayInvalidTagCombinationError,
	displayDependencyValidationHints
} from '../../../../../scripts/modules/ui.js';

// Mock console.log to capture output
const mockConsoleLog = jest.fn();
global.console.log = mockConsoleLog;

describe('Cross-Tag Error Display Functions', () => {
	beforeEach(() => {
		mockConsoleLog.mockClear();
	});

	describe('displayCrossTagDependencyError', () => {
		it('should display cross-tag dependency error with conflicts', () => {
			const conflicts = [
				{
					taskId: 1,
					dependencyId: 2,
					dependencyTag: 'backlog',
					message: 'Task 1 depends on 2 (in backlog)'
				},
				{
					taskId: 3,
					dependencyId: 4,
					dependencyTag: 'done',
					message: 'Task 3 depends on 4 (in done)'
				}
			];

			displayCrossTagDependencyError(conflicts, 'in-progress', 'done', '1,3');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'❌ Cannot move tasks from "in-progress" to "done"'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Cross-tag dependency conflicts detected:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('• Task 1 depends on 2 (in backlog)')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('• Task 3 depends on 4 (in done)')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Resolution options:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('--with-dependencies')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('--ignore-dependencies')
			);
		});

		it('should handle empty conflicts array', () => {
			displayCrossTagDependencyError([], 'backlog', 'done', '1');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('❌ Cannot move tasks from "backlog" to "done"')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Cross-tag dependency conflicts detected:')
			);
		});
	});

	describe('displaySubtaskMoveError', () => {
		it('should display subtask movement restriction error', () => {
			displaySubtaskMoveError('5.2', 'backlog', 'in-progress');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'❌ Cannot move subtask 5.2 directly between tags'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Subtask movement restriction:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'• Subtasks cannot be moved directly between tags'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Resolution options:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('remove-subtask --id=5.2 --convert')
			);
		});
	});

	describe('displayInvalidTagCombinationError', () => {
		it('should display invalid tag combination error', () => {
			displayInvalidTagCombinationError(
				'backlog',
				'backlog',
				'Source and target tags are identical'
			);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('❌ Invalid tag combination')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Error details:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('• Source tag: "backlog"')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('• Target tag: "backlog"')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'• Reason: Source and target tags are identical'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Resolution options:')
			);
		});
	});

	describe('displayDependencyValidationHints', () => {
		it('should display general hints by default', () => {
			displayDependencyValidationHints();

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Helpful hints:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('💡 Use "task-master validate-dependencies"')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('💡 Use "task-master fix-dependencies"')
			);
		});

		it('should display before-move hints', () => {
			displayDependencyValidationHints('before-move');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Helpful hints:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'💡 Tip: Run "task-master validate-dependencies"'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('💡 Tip: Use "task-master fix-dependencies"')
			);
		});

		it('should display after-error hints', () => {
			displayDependencyValidationHints('after-error');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Helpful hints:')
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'🔧 Quick fix: Run "task-master validate-dependencies"'
				)
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'🔧 Quick fix: Use "task-master fix-dependencies"'
				)
			);
		});

		it('should handle unknown context gracefully', () => {
			displayDependencyValidationHints('unknown-context');

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('Helpful hints:')
			);
			// Should fall back to general hints
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('💡 Use "task-master validate-dependencies"')
			);
		});
	});
});
