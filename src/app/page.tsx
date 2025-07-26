'use client'

import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import jsPDF from 'jspdf'

// TypeScript interfaces
interface SearchResult {
  data: {
    title: string
    link: string
    snippet: string
    displayLink: string
    formattedUrl?: string
    cacheId?: string
  }
  selected: boolean
  id: string
}

interface GoogleSearchItem {
  title: string
  link: string
  snippet: string
  displayLink: string
  formattedUrl?: string
  cacheId?: string
}

interface SearchResults {
  originalQuery: string
  dorkQuery: string
  items: SearchResult[]
  totalResults: string
  searchTime: string
}

interface UserDocument {
  id: number
  name: string
  size: string
  file: File
  selected: boolean
}

interface UserSource {
  id: number
  url: string
  title: string
  selected: boolean
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([])
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([])
  const [userSources, setUserSources] = useState<UserSource[]>([])
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [maxResults, setMaxResults] = useState(10) // Changed default to 10

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load search prompt
  const loadSearchPrompt = async (): Promise<string> => {
    try {
      const response = await fetch('/SearchPrompt.txt')
      if (!response.ok) {
        throw new Error('Failed to load search prompt')
      }
      return await response.text()
    } catch (error) {
      console.error('Error loading search prompt:', error)
      return 'Transform this query into an effective Google search query using advanced search operators when appropriate.'
    }
  }

  // Load report prompt
  const loadReportPrompt = async (): Promise<string> => {
    try {
      const response = await fetch('/ReportPrompt.txt')
      if (!response.ok) {
        throw new Error('Failed to load report prompt')
      }
      return await response.text()
    } catch (error) {
      console.error('Error loading report prompt:', error)
      return 'Generate a comprehensive research report based on the provided sources and documents.'
    }
  }

  // Claude API call via Next.js API route
  const transformQueryToDork = async (userQuery: string): Promise<string> => {
    try {
      const searchPrompt = await loadSearchPrompt()

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: userQuery,
          systemPrompt: searchPrompt,
          maxTokens: 4000
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      return data.content[0]?.text?.trim() || userQuery
    } catch (error) {
      console.error('Failed to transform query with Claude:', error)
      return userQuery
    }
  }

  // Google Search API call (modified to handle pagination for more results)
  const searchGoogle = async (dorkQuery: string): Promise<{ items: SearchResult[], searchInformation: { totalResults: string } }> => {
    try {
      const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY
      const GOOGLE_CX = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID
      
      if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_google_search_api_key_here') {
        throw new Error('Google Search API key not configured. Please set NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY in .env.local')
      }
      if (!GOOGLE_CX || GOOGLE_CX === 'your_google_custom_search_engine_id_here') {
        throw new Error('Google Custom Search Engine ID not configured. Please set NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID in .env.local')
      }

      const allResults: SearchResult[] = []
      const resultsPerPage = 10 // API limit
      const totalPages = Math.ceil(maxResults / resultsPerPage)
      
      // Make multiple requests to get more results
      for (let page = 0; page < totalPages; page++) {
        const startIndex = (page * resultsPerPage) + 1
        const numResults = Math.min(resultsPerPage, maxResults - (page * resultsPerPage))
        
        const response = await fetch('/api/google-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: dorkQuery,
            startIndex: startIndex,
            num: numResults
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.items && data.items.length > 0) {
          allResults.push(...data.items.map((item: GoogleSearchItem): SearchResult => ({ 
            data: {
              title: item.title || '',
              link: item.link || '',
              snippet: item.snippet || '',
              displayLink: item.displayLink || '',
              formattedUrl: item.formattedUrl,
              cacheId: item.cacheId
            },
            selected: false,
            id: `${startIndex}-${item.cacheId || Math.random()}`
          })))
        }
        
        // If we got fewer results than requested, no more pages available
        if (!data.items || data.items.length < numResults) {
          break
        }
      }

      return {
        items: allResults,
        searchInformation: { totalResults: allResults.length.toString() }
      }
    } catch (error) {
      console.error('Google search failed:', error)
      throw error
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setSearchResults(null)
    setSelectedResults([])

    try {
      const dorkQuery = await transformQueryToDork(query)
      const results = await searchGoogle(dorkQuery)
      
      setSearchResults({
        originalQuery: query,
        dorkQuery: dorkQuery,
        items: results.items,
        totalResults: results.searchInformation.totalResults,
        searchTime: '0.1'
      })
    } catch (error) {
      console.error('Search failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert('Search failed: ' + errorMessage)
    } finally {
      setIsSearching(false)
    }
  }

  // Toggle result selection
  const toggleResult = (resultIndex: number, isSelected: boolean) => {
    setSearchResults(prev => ({
      ...prev!,
      items: prev!.items.map((item, index) => 
        index === resultIndex ? { ...item, selected: isSelected } : item
      )
    }))
    
    if (isSelected) {
      setSelectedResults(prev => [...prev, searchResults!.items[resultIndex]])
    } else {
      setSelectedResults(prev => prev.filter(r => r.id !== searchResults!.items[resultIndex].id))
    }
  }

  // Select all results
  const selectAllResults = (selectAll: boolean) => {
    setSearchResults(prev => ({
      ...prev!,
      items: prev!.items.map(item => ({ ...item, selected: selectAll }))
    }))
    
    if (selectAll) {
      setSelectedResults([...searchResults!.items])
    } else {
      setSelectedResults([])
    }
  }

  // Handle user document uploads
  const handleUserDocuments = (files: FileList | null) => {
    if (!files) return
    
    const newDocs: UserDocument[] = Array.from(files).map(file => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: file.name,
      size: formatFileSize(file.size),
      file: file,
      selected: true
    }))

    setUserDocuments([...userDocuments, ...newDocs])
  }

  // Toggle user document selection
  const toggleUserDoc = (docId: number, isSelected: boolean) => {
    setUserDocuments(userDocuments.map(doc => 
      doc.id === docId ? { ...doc, selected: isSelected } : doc
    ))
  }

  // Remove user document
  const removeUserDoc = (docId: number) => {
    setUserDocuments(userDocuments.filter(d => d.id !== docId))
  }

  // Handle user source URLs
  const addUserSource = (url: string, title: string = '') => {
    if (!url.trim()) return
    
    const newSource: UserSource = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      url: url.trim(),
      title: title.trim() || url.trim(),
      selected: true
    }

    setUserSources([...userSources, newSource])
  }

  // Toggle user source selection
  const toggleUserSource = (sourceId: number, isSelected: boolean) => {
    setUserSources(userSources.map(source => 
      source.id === sourceId ? { ...source, selected: isSelected } : source
    ))
  }

  // Remove user source
  const removeUserSource = (sourceId: number) => {
    setUserSources(userSources.filter(s => s.id !== sourceId))
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Generate report (modified to use new format)
  const handleGenerateReport = async () => {
    const selectedCount = selectedResults.length
    const selectedUserDocs = userDocuments.filter(d => d.selected !== false).length
    const selectedUserSources = userSources.filter(s => s.selected !== false).length
    const totalSelected = selectedCount + selectedUserDocs + selectedUserSources

    if (totalSelected === 0) {
      alert('Please select at least one item to generate a report.')
      return
    }

    setIsGeneratingReport(true)

    try {
      const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY
      
      if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your_claude_api_key_here') {
        throw new Error('Claude API key not configured.')
      }

      const reportPrompt = await loadReportPrompt()

      const reportInput = `
RESEARCH REPORT REQUEST:
- Original Query: "${searchResults!.originalQuery}"
- Google Dork Used: "${searchResults!.dorkQuery}"
- Report Generation Time: ${new Date().toISOString()}

SELECTED WEB SOURCES (${selectedResults.length} items):
${selectedResults.map((result, index) => `
${index + 1}. ${result.data.title}
   URL: ${result.data.link}
   Source: ${result.data.displayLink}
   Snippet: ${result.data.snippet}
`).join('\n')}

ADDITIONAL USER DOCUMENTS (${userDocuments.filter(d => d.selected !== false).length} items):
${userDocuments.filter(d => d.selected !== false).map((doc, index) => `
${index + 1}. ${doc.name} (${doc.size})
   Type: User-provided document
`).join('\n')}

ADDITIONAL USER SOURCES (${userSources.filter(s => s.selected !== false).length} items):
${userSources.filter(s => s.selected !== false).map((source, index) => `
${index + 1}. ${source.title}
   URL: ${source.url}
   Type: User-provided source
`).join('\n')}

Please generate a comprehensive research report based on these specifically selected sources and documents.
        `

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: reportInput,
          systemPrompt: reportPrompt,
          maxTokens: 4000
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      const reportContent = data.content[0]?.text?.trim() || 'Failed to generate report'
      setGeneratedReport(reportContent)
      setShowReport(true)
    } catch (error) {
      console.error('Report generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert('Report generation failed: ' + errorMessage)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Download report as PDF
  const downloadReport = async () => {
    if (!generatedReport) return

    try {
      const doc = new jsPDF()
      
      // Configuration PDF
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxLineWidth = pageWidth - (margin * 2)
      
      // Fonction pour ajouter du texte avec gestion des retours à la ligne
      const addText = (text: string, startY: number): number => {
        const lines = doc.splitTextToSize(text, maxLineWidth)
        const lineHeight = 6
        let currentY = startY
        
        lines.forEach((line: string) => {
          if (currentY > pageHeight - margin) {
            doc.addPage()
            currentY = margin
          }
          doc.text(line, margin, currentY)
          currentY += lineHeight
        })
        
        return currentY
      }
      
      // Titre du rapport
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      let currentY = addText('DeepFastSearch Research Report', margin)
      currentY += 10
      
      // Date
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      currentY = addText(`Generated: ${new Date().toLocaleDateString()}`, currentY)
      currentY += 10
      
      // Contenu du rapport
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      
      // Convertir le Markdown en texte simple pour PDF
      const cleanText = generatedReport
        .replace(/#{1,6}\s+/g, '') // Supprimer les # des titres
        .replace(/\*\*(.*?)\*\*/g, '$1') // Supprimer le bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Supprimer l'italic markdown
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Convertir les liens
        .replace(/```[\s\S]*?```/g, '[Code Block]') // Remplacer les blocs de code
        .replace(/`(.*?)`/g, '$1') // Supprimer les backticks
      
      addText(cleanText, currentY)
      
      // Télécharger le PDF
      doc.save(`DeepFastSearch_Report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      
      // Fallback : téléchargement en texte
      const blob = new Blob([generatedReport], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DeepFastSearch_Report_${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  const selectedCount = selectedResults.length
  const selectedUserDocs = userDocuments.filter(d => d.selected !== false).length
  const selectedUserSources = userSources.filter(s => s.selected !== false).length
  const totalSelected = selectedCount + selectedUserDocs + selectedUserSources

  // Show generated report
  if (generatedReport && showReport) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-light text-gray-900">Generated Research Report</h3>
              <div className="flex gap-4">
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([generatedReport], { type: 'text/plain' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `DeepFastSearch_Report_${new Date().toISOString().split('T')[0]}.txt`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                  }}
                  className="flex items-center gap-3 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Download TXT
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-900 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Back to Results
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 prose prose-lg max-w-none">
              <ReactMarkdown 
                components={{
                  h1: ({children}) => <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8 first:mt-0 border-b border-gray-200 pb-2">{children}</h1>,
                  h2: ({children}) => <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6">{children}</h2>,
                  h3: ({children}) => <h3 className="text-xl font-medium text-gray-800 mb-3 mt-5">{children}</h3>,
                  h4: ({children}) => <h4 className="text-lg font-medium text-gray-700 mb-2 mt-4">{children}</h4>,
                  p: ({children}) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="text-gray-700 mb-4 pl-6 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="text-gray-700 mb-4 pl-6 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="list-disc list-inside">{children}</li>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{children}</blockquote>,
                  code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                  pre: ({children}) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                  a: ({href, children}) => <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({children}) => <em className="italic text-gray-800">{children}</em>,
                  hr: () => <hr className="border-gray-300 my-8" />,
                  table: ({children}) => <table className="min-w-full border-collapse border border-gray-300 my-4">{children}</table>,
                  th: ({children}) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left">{children}</th>,
                  td: ({children}) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
                }}
              >
                {generatedReport}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-6xl font-light text-gray-900 mb-6 tracking-tight">
            DeepFastSearch
          </h1>
          <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
            AI-powered intelligent search for comprehensive research and analysis
          </p>
        </header>

        {/* Search Interface */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 mb-10 shadow-sm">
          {/* Search Settings */}
          <div className="mb-6 text-center">
            <label className="text-sm font-medium text-gray-700 mr-3">Max Results:</label>
            <select 
              value={maxResults} 
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={30}>30 results</option>
              <option value={50}>50 results</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Note: Plus de résultats = plus de requêtes API</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the web with AI-powered intelligence..."
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 shadow-sm focus:border-gray-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-8 py-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-lg min-w-[140px]"
            >
              {isSearching ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white mr-3"></div>
                  Searching...
                </div>
              ) : (
                'Search'
              )}
            </button>
          </form>

          <div className="text-center">
            <div className="text-sm text-gray-600 font-light">
              <p className="mb-2">⚡ AI-powered web search with advanced query optimization</p>
              <p>🔍 Smart filtering and document analysis for research</p>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 shadow-sm">
            <h3 className="text-3xl font-light text-gray-900 mb-6">
              Found {searchResults.items.length} results - Select documents for your report
            </h3>

            {/* Add Sources Section - Moved to top */}
            <div className="bg-white border border-gray-300 rounded-xl p-8 mb-8">
              <h3 className="text-xl font-medium text-gray-900 mb-6">Add Your Own Sources</h3>
              
              {/* Add URL Source */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Add from URL</h4>
                <div className="flex gap-4">
                  <input
                    type="url"
                    id="sourceUrl"
                    placeholder="https://example.com/article"
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500"
                  />
                  <input
                    type="text"
                    id="sourceTitle"
                    placeholder="Optional title"
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = (document.getElementById('sourceUrl') as HTMLInputElement).value
                      const title = (document.getElementById('sourceTitle') as HTMLInputElement).value
                      if (url) {
                        addUserSource(url, title)
                        ;(document.getElementById('sourceUrl') as HTMLInputElement).value = ''
                        ;(document.getElementById('sourceTitle') as HTMLInputElement).value = ''
                      }
                    }}
                    className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors font-medium"
                  >
                    Add Source
                  </button>
                </div>
                
                {/* User Sources List */}
                {userSources.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-lg font-medium text-gray-800">Added Sources:</h4>
                    {userSources.map((source) => (
                      <div key={source.id} className="flex items-center bg-gray-50 border border-gray-300 rounded-xl p-4">
                        <input
                          type="checkbox"
                          id={`source_${source.id}`}
                          checked={source.selected !== false}
                          onChange={(e) => toggleUserSource(source.id, e.target.checked)}
                          className="w-4 h-4 text-gray-900 cursor-pointer mr-4 rounded"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 mb-1">{source.title}</div>
                          <div className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer" 
                               onClick={() => window.open(source.url, '_blank')}>
                            {source.url}
                          </div>
                        </div>
                        <button
                          onClick={() => removeUserSource(source.id)}
                          className="text-gray-500 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                          title="Remove source"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Documents Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4">Add Documents</h4>
                <div className="text-center">
                  <input
                    type="file"
                    id="userDocsInput"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(e) => handleUserDocuments(e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('userDocsInput')?.click()}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors font-medium"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Documents
                  </button>
                  
                  {userDocuments.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-lg font-medium text-gray-800">Uploaded Documents:</h4>
                      {userDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center bg-gray-50 border border-gray-300 rounded-xl p-4">
                          <input
                            type="checkbox"
                            id={`doc_${doc.id}`}
                            checked={doc.selected !== false}
                            onChange={(e) => toggleUserDoc(doc.id, e.target.checked)}
                            className="w-4 h-4 text-gray-900 cursor-pointer mr-4 rounded"
                          />
                          <div className="flex-1 text-left">
                            <span className="font-medium text-gray-900 mr-2">{doc.name}</span>
                            <span className="text-sm text-gray-500">{doc.size}</span>
                          </div>
                          <button
                            onClick={() => removeUserDoc(doc.id)}
                            className="text-gray-500 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                            title="Remove document"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Report Button with Select All controls */}
            <div className="text-center mb-8">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={() => selectAllResults(true)}
                  className="px-6 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                >
                  Select All Results
                </button>
                <button
                  onClick={() => selectAllResults(false)}
                  className="px-6 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                >
                  Deselect All Results
                </button>
              </div>
              
              <button
                onClick={handleGenerateReport}
                disabled={totalSelected === 0 || isGeneratingReport}
                className="px-12 py-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-lg"
              >
                {isGeneratingReport ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white mr-3"></div>
                    Generating Report...
                  </div>
                ) : totalSelected === 0 ? (
                  'Select items to generate report'
                ) : (
                  `Generate Report (${totalSelected} items selected)`
                )}
              </button>
            </div>

            {/* Results List with Selection - Now at bottom */}
            <div className="space-y-4">
              <h4 className="text-2xl font-light text-gray-900 mb-4">Search Results</h4>
              {searchResults.items.map((result, index) => (
                <div key={result.id} className="flex bg-white border border-gray-300 rounded-xl p-6 hover:shadow-md hover:border-gray-400 transition-all duration-300">
                  <div className="mr-5 pt-1">
                    <input
                      type="checkbox"
                      id={`result_${index}`}
                      checked={result.selected}
                      onChange={(e) => toggleResult(index, e.target.checked)}
                      className="w-5 h-5 text-gray-900 cursor-pointer rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-xl font-medium text-gray-900 cursor-pointer hover:text-gray-700 mb-2"
                      onClick={() => window.open(result.data.link, '_blank')}
                      title="Click to open in new tab"
                    >
                      {result.data.title}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">{result.data.formattedUrl || result.data.displayLink}</div>
                    <div className="text-gray-700 text-base leading-relaxed mb-4 font-light">{result.data.snippet}</div>
                    <button
                      onClick={() => window.open(result.data.link, '_blank')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs text-gray-600 transition-colors font-medium"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Open Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500 text-sm font-light">
          <p>&copy; 2025 DeepFastSearch By Kamil Bourouiba. Intelligent search for your research.</p>
        </footer>
      </div>
    </div>
  )
} 