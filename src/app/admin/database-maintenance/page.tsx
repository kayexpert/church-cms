import { DatabaseCleanup } from "@/components/admin/database-cleanup";

export const metadata = {
  title: "Database Maintenance",
  description: "Optimize database performance and clean up temporary tables",
};

export default function DatabaseMaintenancePage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Database Maintenance</h1>
      <p className="text-muted-foreground mb-6">
        Use these tools to optimize database performance and clean up temporary tables.
        This can help improve application speed and reduce errors.
      </p>
      <DatabaseCleanup />
    </div>
  );
}
