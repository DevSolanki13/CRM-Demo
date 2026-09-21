import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = async () => {
    if (this.props.onResetState) {
      try {
        await this.props.onResetState();
        this.setState({ hasError: false, error: null, errorInfo: null });
      } catch (err) {
        console.error("Failed to reset state via ErrorBoundary:", err);
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  handleCopyError = () => {
    const text = `Error: ${this.state.error?.message}\n\nStack: ${this.state.error?.stack}\n\nComponent: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F8] text-[#12161C] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl shadow-[0_8px_24px_rgba(18,22,28,0.12)] p-8 space-y-6">
            
            {/* Header Badge & Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FDF2F1] border border-[#F4C4C1] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#922D27]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1]">
                    System Error 500
                  </span>
                  <span className="text-xs text-[#5B6472]">Client-Side Exception Caught</span>
                </div>
                <h2 className="text-lg font-display font-extrabold text-[#12161C] mt-1">
                  Something interrupted the sales console
                </h2>
              </div>
            </div>

            <p className="text-xs text-[#5B6472] leading-relaxed">
              An unexpected render error occurred in this module. Your CRM database is preserved, and you can recover instantly using the options below.
            </p>

            {/* Error Message Box */}
            <div className="p-3.5 bg-[#FAFCFD] border border-[#E3E6EA] rounded-xl font-mono text-[11px] text-[#922D27] break-words">
              <strong>Error:</strong> {this.state.error?.message || "Unknown client exception"}
            </div>

            {/* Expandable Stack Trace */}
            {this.state.error?.stack && (
              <details className="group border border-[#E3E6EA] rounded-xl overflow-hidden text-xs">
                <summary className="px-3.5 py-2.5 bg-[#F6F7F8] text-[#5B6472] cursor-pointer font-medium hover:text-[#12161C] flex items-center justify-between">
                  <span>View technical diagnostics</span>
                  <span className="text-[10px] font-mono text-[#5B6472] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-3.5 bg-[#12161C] text-[#D8E8EF] font-mono text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E3E6EA]">
              <button
                onClick={this.handleCopyError}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E3E6EA] text-[#5B6472] hover:text-[#12161C] flex items-center justify-center gap-2 transition-colors"
                title="Copy error details to clipboard"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#255B40]" />
                    <span className="text-[#255B40]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Diagnostics</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={this.handleReset}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-[#EFF6F9] hover:bg-[#D8E8EF] text-[#1D4E63] border border-[#D8E8EF] flex items-center justify-center gap-2 transition-colors"
                  title="Reset demo data to default clean state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo State</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-[#1D4E63] hover:bg-[#153B4B] text-white flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  title="Reload current page"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Console</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
