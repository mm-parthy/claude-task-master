# Fix Plan: Systematic `writeJSON` Context Parameter Issues

## 🎯 Overview

Following the pattern established in PR 856, we need to systematically fix all remaining `writeJSON` calls that are missing the required `projectRoot` and `tag` parameters. This is a critical bug that causes tag corruption and data loss in tagged task list environments.

## 🚨 Root Cause

The `writeJSON` function requires `projectRoot` and `tag` parameters to properly handle tagged task lists:

```javascript
writeJSON(filepath, data, projectRoot, tag)
```

When these parameters are missing, the function cannot resolve the correct tag context, leading to:

- ❌ Complete deletion of other tags from `tasks.json`
- ❌ Data corruption in multi-tag environments
- ❌ Loss of user work and task organization

## 📋 Affected Functions (Based on Audit)

### 🟥 Critical Priority - Immediate Fixes Needed

| Function | File | Line | Impact | User Reports |
|----------|------|------|--------|--------------|
| **add-subtask** | `mcp-server/src/core/direct-functions/add-subtask.js` | N/A | Critical | ✅ User reported |
| **add-task** | `scripts/modules/task-manager/add-task.js` | 555 | Critical | Likely |
| **remove-task** | `scripts/modules/task-manager/remove-task.js` | 174 | Critical | Likely |
| **set-task-status** | `scripts/modules/task-manager/set-task-status.js` | 134 | Critical | Likely |

### 🟨 Medium Priority - Systematic Issues

| Function | File | Lines | Impact |
|----------|------|-------|--------|
| **tag-management** | `scripts/modules/task-manager/tag-management.js` | 148,368,487,908,1065 | High |
| **expand-task MCP** | `mcp-server/src/core/direct-functions/expand-task.js` | 174 | Medium |

### ✅ Already Fixed

| Function | Status | PR |
|----------|--------|-----|
| **update-tasks** | ✅ Fixed in PR 856 | #856 |

## ��️ Fix Pattern (Based on PR 856)

### 1. Core Function Pattern

**For each core function in `scripts/modules/task-manager/`:**

```javascript
// BEFORE (BROKEN):
writeJSON(tasksPath, data);

// AFTER (FIXED):
writeJSON(tasksPath, data, projectRoot, currentTag);
```

**Required changes:**

1. Add `getCurrentTag` import if missing
2. Ensure `projectRoot` is available in function scope
3. Add tag resolution logic with fallback
4. Update `readJSON` calls to include context
5. Update `writeJSON` calls to include context

### 2. MCP Direct Function Pattern

**For each MCP direct function:**

```javascript
// BEFORE (BROKEN):
const result = await coreFunction(tasksPath, ...args);

// AFTER (FIXED):
const result = await coreFunction(
    tasksPath, 
    ...args,
    {
        projectRoot: args.projectRoot,
        tag: args.tag
    }
);
```

### 3. MCP Tool Pattern

**For each MCP tool:**

```javascript
// Add to schema:
tag: z.string().optional().describe('Tag context to operate on')

// Extract and pass:
const { ..., tag } = args;
await directFunction({ ...args, tag }, log, { session });
```

## 📅 Implementation Plan

### Phase 1: Critical User-Reported Issue (Immediate)

**Target: Fix add-subtask functionality**

- [ ] **PR 1: Fix add-subtask tag corruption**
  - File: `mcp-server/src/core/direct-functions/add-subtask.js`
  - Issue: Missing context parameter in core function calls
  - Pattern: Follow PR 856 exactly
  - Testing: Add regression test for tag preservation
  - Timeline: Immediate (user-reported bug)

### Phase 2: Core Function Fixes (Week 1)

**Target: Fix remaining core task-manager functions**

- [ ] **PR 2: Fix add-task tag corruption**
  - File: `scripts/modules/task-manager/add-task.js`
  - Line: 555
  - Pattern: Add `projectRoot` and `targetTag` to `writeJSON`

- [ ] **PR 3: Fix remove-task tag corruption**
  - File: `scripts/modules/task-manager/remove-task.js`
  - Line: 174
  - Pattern: Add `projectRoot` and `currentTag` to `writeJSON`

- [ ] **PR 4: Fix set-task-status tag corruption**
  - File: `scripts/modules/task-manager/set-task-status.js`
  - Line: 134
  - Pattern: Add `options.projectRoot` and `currentTag` to `writeJSON`

### Phase 3: Tag Management Fixes (Week 2)

**Target: Fix tag-management functions**

- [ ] **PR 5: Fix tag-management writeJSON calls**
  - File: `scripts/modules/task-manager/tag-management.js`
  - Lines: 148, 368, 487, 908, 1065
  - Pattern: Add `projectRoot` and appropriate tag context

### Phase 4: MCP Function Fixes (Week 2)

**Target: Fix remaining MCP direct functions**

- [ ] **PR 6: Fix expand-task MCP tag corruption**
  - File: `mcp-server/src/core/direct-functions/expand-task.js`
  - Line: 174
  - Pattern: Add context parameter to core function call

## 🧪 Testing Strategy

### For Each PR:

1. **Unit Tests**
   - Add regression test for tag preservation
   - Test with multiple tag contexts (master, feature-branch)
   - Verify no data loss during operations

2. **Integration Tests**
   - Test MCP tool → direct function → core function chain
   - Verify proper parameter propagation
   - Test error handling with missing context

3. **Manual Testing**
   - Create multi-tag environment
   - Perform the operation
   - Verify all tags remain intact

### Test Template (Based on PR 856):

```javascript
describe('Tag preservation during [operation]', () => {
  it('should preserve all tags when [operation] is performed', async () => {
    // Setup multi-tag environment
    const testData = {
      master: { tasks: [...], metadata: {...} },
      'feature-branch': { tasks: [...], metadata: {...} }
    };
    
    // Perform operation on master tag
    await [operation](tasksPath, ...args, { projectRoot, tag: 'master' });
    
    // Verify both tags still exist
    const result = readJSON(tasksPath);
    expect(result.master).toBeDefined();
    expect(result['feature-branch']).toBeDefined();
    expect(result['feature-branch'].tasks).toHaveLength(originalLength);
  });
});
```

## 📝 PR Template for Each Fix

```markdown
## Description

Fix critical bug in [function] that was corrupting tasks.json when working with tagged task lists. The issue was missing `projectRoot` and `tag` parameters in the `writeJSON` call, causing data corruption and task disappearance in tagged contexts.

Follows the same pattern as PR #856.

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Root Cause

The `[function]` was calling `writeJSON(filepath, data)` without the required `projectRoot` and `tag` parameters. When `writeJSON` tries to handle tagged data without proper context, it corrupts the file structure causing tasks to disappear from tasks.json.

## Changes Made

1. **Core Function Fix** (`[file path]`):
   - Added proper context parameter handling
   - Fixed `writeJSON` call to include `projectRoot` and `tag` parameters
   - [MCP only] Updated MCP direct function to extract and pass tag parameter
   - [MCP only] Updated MCP tool to accept tag parameter in schema

2. **Testing**:
   - Added regression test for tag preservation
   - Verified fix prevents corruption in multi-tag scenarios

## Testing

- [x] I have tested this locally
- [x] All existing tests pass
- [x] I have added tests for new functionality
- [x] Verified fix prevents the specific corruption scenario
- [x] Tested with multiple tag contexts (master, feature-branch)

## Changeset

- [x] I have created a changeset (patch level for bug fix)
```

## ⚠️ Important Notes

### Development Guidelines

1. **Target `next` branch** for all PRs
2. **Test everything locally** before submitting
3. **Create changesets** for each fix (patch level)
4. **Follow PR 856 pattern exactly** - don't deviate

### Quality Standards

1. **Each PR should fix ONE function** - keep them focused
2. **Include comprehensive tests** - prevent regression
3. **Self-review code** before submitting
4. **Run full test suite** locally

### Review Process

- PRs will be reviewed quickly (hours, not days)
- Focus on pattern consistency with PR 856
- Expect fast feedback and engagement
- Team may help finish PRs if needed

## 🚀 Success Criteria

### For Each PR:
- [ ] Function no longer corrupts tags during operation
- [ ] All existing tests pass
- [ ] New regression test added and passing
- [ ] Changeset created
- [ ] Code follows PR 856 pattern exactly

### Overall Success:
- [ ] No more user reports of tag corruption
- [ ] All `writeJSON` calls include proper context
- [ ] Comprehensive test coverage prevents regression
- [ ] Documentation updated with proper patterns

## 📞 Support

- **Discord**: [Join our community](https://discord.gg/taskmasterai)
- **Issues**: Reference this plan in related issues
- **Pattern Reference**: Always refer back to PR #856

---

**This is a critical bug affecting user data. Let's fix it systematically and thoroughly.** 🚀
