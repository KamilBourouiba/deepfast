import { Config } from './config'

interface SearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  formattedUrl?: string
  relevance: string
}

interface SearchResponse {
  results: SearchResult[]
  totalResults: string
  searchTime: string
  originalQuery: string
  dorkQuery: string
  success: boolean
  error?: string
}

interface UserDocument {
  id: number
  name: string
  size: string
  file: File
  selected?: boolean
}

interface SelectedData {
  originalQuery: string
  dorkQuery: string
  selectedResults: SearchResult[]
  userDocuments: UserDocument[]
  timestamp: string
}

export class APIClient {
  private config: Config
  public searchPrompt: string | null = null
  public reportPrompt: string | null = null

  constructor(config: Config) {
    this.config = config
  }

  // Load the search prompt from SearchPrompt.txt
  async loadSearchPrompt(): Promise<void> {
    try {
      const response = await fetch('/SearchPrompt.txt')
      this.searchPrompt = await response.text()
    } catch (error) {
      console.error('Failed to load search prompt:', error)
      // Fallback prompt if file loading fails
      this.searchPrompt = `Convert the user's natural language query into an effective Google Dork search query. 
      Use appropriate operators like filetype:, site:, inurl:, intitle:, intext:, etc. 
      Focus on finding the most relevant results for their intent.
      Return only the Google Dork query, nothing else.`
    }
  }

  // Load the report prompt from ReportPrompt.txt
  async loadReportPrompt(): Promise<void> {
    try {
      const response = await fetch('/ReportPrompt.txt')
      this.reportPrompt = await response.text()
    } catch (error) {
      console.error('Failed to load report prompt:', error)
      // Fallback prompt if file loading fails
      this.reportPrompt = `Generate a detailed research report based on the search results provided. 
      Include an executive summary, methodology, findings, analysis, and conclusions. 
      Format the report professionally with clear sections and headings.`
    }
  }

  // Call Claude API directly to transform user query into Google Dork
  async transformQueryToDork(userQuery: string): Promise<string> {
    try {
      const CLAUDE_API_KEY = localStorage.getItem('claude_api_key') || 
        prompt("Enter your Claude API key:") || ''
      
      if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key required')
      }
      localStorage.setItem('claude_api_key', CLAUDE_API_KEY)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: this.searchPrompt,
          messages: [{
            role: 'user',
            content: userQuery
          }],
          max_tokens: 200
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content[0]?.text?.trim() || userQuery
    } catch (error) {
      console.error('Failed to transform query with Claude:', error)
      // Fallback: return original query if Claude fails
      return userQuery
    }
  }

  // Search Google directly using Custom Search API
  async searchGoogle(dorkQuery: string, startIndex: number = 1): Promise<{ results: SearchResult[], totalResults: string, searchTime: string }> {
    try {
      const GOOGLE_API_KEY = localStorage.getItem('google_api_key') || 
        prompt("Enter your Google Search API key:") || ''
      const GOOGLE_CX = localStorage.getItem('google_cx') || 
        prompt("Enter your Google Custom Search Engine ID:") || ''
      
      if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        throw new Error('Google API credentials required')
      }
      localStorage.setItem('google_api_key', GOOGLE_API_KEY)
      localStorage.setItem('google_cx', GOOGLE_CX)

      const params = new URLSearchParams({
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: dorkQuery,
        start: startIndex.toString(),
        num: '10'
      })

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
      
      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`)
      }

      const data = await response.json()
      return this.formatGoogleResults(data)
    } catch (error) {
      console.error('Google Search API error:', error)
      throw error
    }
  }

  // Format Google Search results for display
  formatGoogleResults(googleData: { items?: Array<{ title: string, snippet: string, link: string, displayLink: string, formattedUrl?: string }>, searchInformation?: { totalResults?: string, searchTime?: string } }): { results: SearchResult[], totalResults: string, searchTime: string } {
    const results: SearchResult[] = []
    
    if (googleData.items && googleData.items.length > 0) {
      googleData.items.forEach((item) => {
        results.push({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          displayLink: item.displayLink,
          formattedUrl: item.formattedUrl,
          relevance: '95%' // Could be calculated based on search ranking
        })
      })
    }

    return {
      results: results,
      totalResults: googleData.searchInformation?.totalResults || '0',
      searchTime: googleData.searchInformation?.searchTime || '0'
    }
  }

  // Main search function that combines Claude + Google Search
  async performSearch(userQuery: string): Promise<SearchResponse> {
    try {
      // Step 1: Transform user query into Google Dork using Claude
      const dorkQuery = await this.transformQueryToDork(userQuery)
      
      // Step 2: Search Google with the dork query
      const searchResults = await this.searchGoogle(dorkQuery)
      
      return {
        ...searchResults,
        originalQuery: userQuery,
        dorkQuery: dorkQuery,
        success: true
      }
    } catch (error) {
      console.error('Search failed:', error)
      return {
        results: [],
        totalResults: '0',
        searchTime: '0',
        originalQuery: userQuery,
        dorkQuery: userQuery,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }
    }
  }

  // Generate custom report using Claude with selected items
  async generateCustomReport(selectedData: SelectedData): Promise<{ content: string, success: boolean, error?: string }> {
    try {
      const CLAUDE_API_KEY = localStorage.getItem('claude_api_key') || 
        prompt("Enter your Claude API key:") || ''
      
      if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key required')
      }

      const reportInput = `
RESEARCH REPORT REQUEST:
- Original Query: "${selectedData.originalQuery}"
- Google Dork Used: "${selectedData.dorkQuery}"
- Report Generation Time: ${selectedData.timestamp}

SELECTED WEB SOURCES (${selectedData.selectedResults.length} items):
${selectedData.selectedResults.map((result, index) => `
${index + 1}. ${result.title}
   URL: ${result.link}
   Source: ${result.displayLink}
   Snippet: ${result.snippet}
`).join('\n')}

ADDITIONAL USER DOCUMENTS (${selectedData.userDocuments.length} items):
${selectedData.userDocuments.map((doc, index) => `
${index + 1}. ${doc.name} (${doc.size})
   Type: User-provided document
`).join('\n')}

Please generate a comprehensive research report based on these specifically selected sources and documents. Focus on the curated content provided above, as these were manually selected for relevance and quality by the researcher.
      `

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: this.reportPrompt,
          messages: [{
            role: 'user',
            content: reportInput
          }],
          max_tokens: 4000
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        content: data.content[0]?.text?.trim() || 'Failed to generate report',
        success: true
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }
    }
  }
} 