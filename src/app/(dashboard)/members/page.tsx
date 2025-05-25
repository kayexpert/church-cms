import { Layout } from "@/components/layout";
import { MembersServer } from "./members-server";

export const metadata = {
  title: "Members | Church Management System",
  description: "Manage church members",
};

export default function MembersPageRoute() {
  return (
    <Layout title="Members">
      <MembersServer />
    </Layout>
  );
}
