// Configuration for DeepFastSearch APIs
export class Config {
  public BACKEND_URL: string
  public CLAUDE_API_ENDPOINT: string
  public SEARCH_API_ENDPOINT: string
  public REPORT_API_ENDPOINT: string
  public isDevelopment: boolean

  constructor() {
    // API keys are handled client-side for this demo
    this.BACKEND_URL = typeof window !== 'undefined' ? window.location.origin : ''
    this.CLAUDE_API_ENDPOINT = '/api/claude'
    this.SEARCH_API_ENDPOINT = '/api/search'
    this.REPORT_API_ENDPOINT = '/api/report'
    
    // For development detection
    this.isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  }

  // Check if we're running properly (no backend needed for this demo)
  validateConfig(): boolean {
    // No backend required - everything runs client-side
    console.log('Running in client-side mode - API keys will be requested when needed')
    return true
  }

  // Get full endpoint URLs
  getClaudeEndpoint(): string {
    return `${this.BACKEND_URL}${this.CLAUDE_API_ENDPOINT}`
  }

  getSearchEndpoint(): string {
    return `${this.BACKEND_URL}${this.SEARCH_API_ENDPOINT}`
  }

  getReportEndpoint(): string {
    return `${this.BACKEND_URL}${this.REPORT_API_ENDPOINT}`
  }
} 