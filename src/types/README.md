# Type Definitions

This directory contains TypeScript type definitions used throughout the application. These types provide a consistent interface for data structures and help catch errors at compile time.

## Structure

- **index.ts**: Re-exports all types from the various type files
- **auth.ts**: Authentication-related types
- **member.ts**: Member-related types
- **common.ts**: Common utility types used across the application

## Usage

Import types from the types directory:

```typescript
import { Member, MemberStats } from '@/types/member';
// or
import { Member, MemberStats } from '@/types';
```

## Best Practices

1. **Keep types in sync with database schema**: Ensure that types accurately reflect the database schema to avoid runtime errors.

2. **Use interfaces for objects**: Use interfaces for object types that represent entities or data structures.

3. **Use type aliases for unions and primitives**: Use type aliases for union types, primitive types, or simple object types.

4. **Export all types**: Export all types from their respective files and re-export them from index.ts.

5. **Use descriptive names**: Use descriptive names for types that clearly indicate their purpose.

6. **Document complex types**: Add JSDoc comments to complex types to explain their purpose and usage.

7. **Keep types DRY**: Avoid duplicating type definitions. Use composition and inheritance to build complex types from simpler ones.

## Example

```typescript
/**
 * Member type representing a church member
 */
export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  // ...other properties
}

/**
 * Member with related entities
 */
export interface MemberWithRelations extends Member {
  departments?: string[];
  certificates?: string[];
}
```
