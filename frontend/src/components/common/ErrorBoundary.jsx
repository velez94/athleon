

import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected happened. 
              The error has been logged and we'll look into it.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleReset} className="btn-primary">
                Try Again
              </button>
              <button onClick={() => window.location.href = '/'} className="btn-secondary">
                Go to Home
              </button>
            </div>
          </div>

          <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              padding: 20px;
            }
            .error-boundary-content {
              background: white;
              border-radius: 16px;
              padding: 40px;
              max-width: 600px;
              text-align: center;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            }
            .error-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            .error-boundary-content h1 {
              color: #2c3e50;
              margin: 0 0 15px 0;
              font-size: 28px;
            }
            .error-message {
              color: #6c757d;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .error-details {
              text-align: left;
              margin: 20px 0;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #dee2e6;
            }
            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: #495057;
              margin-bottom: 10px;
            }
            .error-stack {
              font-size: 12px;
              color: #dc3545;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .error-actions {
              display: flex;
              gap: 15px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .btn-primary, .btn-secondary {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-primary {
              background: linear-gradient(135deg, #EE5F32 0%, #B87333 100%);
              color: white;
            }
            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(255, 87, 34, 0.4);
            }
            .btn-secondary {
              background: #6c757d;
              color: white;
            }
            .btn-secondary:hover {
              background: #5a6268;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
