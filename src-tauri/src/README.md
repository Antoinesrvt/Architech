# Backend Command Structure Guidelines

This document outlines the command structure patterns used in this application to ensure consistent parameter passing between the frontend (TypeScript) and backend (Rust).

## Command Parameter Patterns

We have two main parameter patterns:

### 1. Direct Parameters

Some commands accept parameters directly at the top level of the args object:

```rust
#[command]
pub async fn check_directory_exists(name: String, path: String) -> Result<bool, String> {
    // Implementation...
}
```

These commands should be invoked from the frontend like this:

```typescript
invoke('check_directory_exists', { name: "project-name", path: "/some/path" });
```

### 2. Param Wrapper

Other commands use a wrapper struct called `ProjectIdParam` which contains a `project_id` field:

```rust
#[command]
pub async fn get_project_status(
    param: ProjectIdParam,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<ProjectStatusResponse, String> {
    // Implementation...
}
```

These commands should be invoked from the frontend like this:

```typescript
invoke('get_project_status', { param: { project_id: "some-id" } });
```

## Command List

### Direct Parameter Commands

- `validate_project_config`: Takes `config: ProjectConfig`
- `generate_project`: Takes `config: ProjectConfig`
- `check_directory_exists`: Takes `name: String, path: String`
- `browse_directory`: Takes `title: String`
- `open_in_editor`: Takes `path: String, editor: String`
- `open_in_folder`: Takes `path: String`

### Param Wrapper Commands

- `get_project_status`: Takes `param: ProjectIdParam`
- `initialize_project_tasks`: Takes `param: ProjectIdParam`
- `get_project_logs`: Takes `param: ProjectIdParam`
- `cancel_project_generation`: Takes `param: ProjectIdParam`
- `resume_project_generation`: Takes `param: ProjectIdParam`

## Adding New Commands

When adding new commands:

1. Decide if it should use direct parameters or a param wrapper
2. Add the command pattern to the frontend `command-types.ts` file
3. Ensure the Rust function signature matches the expected parameter structure
4. Update this documentation to include the new command

By following these guidelines, we'll avoid mismatches between frontend and backend parameter structures. 