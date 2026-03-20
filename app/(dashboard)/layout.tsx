import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="min-h-screen flex-1 overflow-auto bg-white text-foreground dark:bg-slate-950 dark:text-slate-100">
        {children}
      </main>
    </div>
  );
}
