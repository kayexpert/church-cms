"use client";

// Import the new component
import { AddMemberDialog as AddMemberDialogComponent } from "./add";

// Re-export the component with the same name
export function AddMemberDialog(props: React.ComponentProps<typeof AddMemberDialogComponent>) {
  return <AddMemberDialogComponent {...props} />;
}
