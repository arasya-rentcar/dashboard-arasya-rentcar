import TopBar from './TopBar';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
}

export default function DashboardShell({ title, children }: DashboardShellProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar title={title} />
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
