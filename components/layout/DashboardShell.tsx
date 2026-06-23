import TopBar from './TopBar';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
}

export default function DashboardShell({ title, children }: DashboardShellProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar title={title} />
      <main className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
