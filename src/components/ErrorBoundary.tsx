import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch (e) {
      window.location.href = '/';
    }
  };

  private handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-screen" className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 text-center border border-gray-100 shadow-xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              พบข้อผิดพลาดในการโหลดหน้าเว็บ
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              ระบบได้บันทึกข้อผิดพลาดและปกป้องข้อมูลของคุณเรียบร้อยแล้ว กรุณากดปุ่มเพื่อรีเฟรชหน้าเว็บและใช้งานต่อได้ทันทีค่ะ
            </p>

            <div className="space-y-3">
              <button
                id="error-reload-button"
                onClick={this.handleReset}
                className="w-full py-3.5 bg-black hover:bg-gray-800 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                รีเฟรชหน้าเว็บ (Reload Page)
              </button>

              <button
                id="error-clearcache-button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 active:scale-[0.99] text-gray-700 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                กลับสู่หน้าหลัก (Back to Home)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

