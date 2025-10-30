import { FileUpload } from '@/components/FileUpload';
import { BarChart3 } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))]">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Dashboard</h1>
              <p className="text-sm text-muted-foreground">Import and analyze your Excel data</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Upload Your Data
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload your Excel file to get started. Supports .xlsx, .xls, and .csv formats.
              Your data will be processed securely and ready for analysis.
            </p>
          </div>

          <FileUpload />

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            <div className="p-6 rounded-lg bg-card border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-upload)] transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">Smart Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detect data patterns and insights
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-upload)] transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">Secure Processing</h3>
              <p className="text-sm text-muted-foreground">
                Your data is processed securely and never stored
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-upload)] transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">Fast Results</h3>
              <p className="text-sm text-muted-foreground">
                Get instant insights from your spreadsheet data
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
