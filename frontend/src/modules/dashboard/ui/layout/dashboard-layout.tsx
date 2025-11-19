import { SideBar } from "../components/sidebar";
import { Header } from "../components/header";
import { CreateWorkflowModal } from "@/modules/workflows/ui/components/create-workflow-modal";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <>
      <CreateWorkflowModal />
      <main className="max-w-7xl mx-auto px-2">
        <Header />
        <div className="flex flex-row gap-4">
          <SideBar />
          <div className="flex-1">
            <div className="px-4 pt-6">{children}</div>
          </div>
        </div>
      </main>
    </>
  );
};
