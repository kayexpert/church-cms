import { EventsPage } from "@/components/events/events-page";
import { Layout } from "@/components/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events | Church Management System",
  description: "Manage church events and calendar",
};

export default function EventsPageRoute() {
  return (
    <Layout title="Events">
      <EventsPage />
    </Layout>
  );
}
