'use client'

import { useState } from 'react'

interface Result {
  title: string
  link: string
  snippet: string
  displayLink: string
  formattedUrl?: string
}

interface SearchResults {
  originalQuery: string
  dorkQuery: string
  results: Result[]
  totalResults: string
  searchTime: string
  success: boolean
}

interface UserDocument {
  id: number
  name: string
  size: string
  file: File
  selected?: boolean
}

interface ResultsDisplayProps {
  searchResults: SearchResults
  selectedResults: Array<{ index: number; data: Result }>
  setSelectedResults: (results: Array<{ index: number; data: Result }>) => void
  userDocuments: UserDocument[]
  setUserDocuments: (docs: UserDocument[]) => void
  onGenerateReport: () => void
  isGeneratingReport: boolean
  generatedReport: string | null
  onDownloadReport: () => void
}

export default function ResultsDisplay({
  searchResults,
  selectedResults,
  setSelectedResults,
  userDocuments,
  setUserDocuments,
  onGenerateReport,
  isGeneratingReport,
  generatedReport,
  onDownloadReport
}: ResultsDisplayProps) {
  const [showReport, setShowReport] = useState(false)

  const toggleResult = (index: number, isSelected: boolean) => {
    if (isSelected) {
      if (!selectedResults.find(r => r.index === index)) {
        setSelectedResults([...selectedResults, {
          index: index,
          data: searchResults.results[index]
        }])
      }
    } else {
      setSelectedResults(selectedResults.filter(r => r.index !== index))
    }
  }

  const selectAllResults = (select: boolean) => {
    if (select) {
      const allResults = searchResults.results.map((result, index) => ({
        index,
        data: result
      }))
      setSelectedResults(allResults)
    } else {
      setSelectedResults([])
    }
  }

  const handleUserDocuments = (files: FileList | null) => {
    if (!files) return

    const newDocs = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: formatFileSize(file.size),
      file: file,
      selected: true
    }))

    setUserDocuments([...userDocuments, ...newDocs])
  }

  const toggleUserDoc = (docId: number, isSelected: boolean) => {
    setUserDocuments(userDocuments.map(doc => 
      doc.id === docId ? { ...doc, selected: isSelected } : doc
    ))
  }

  const removeUserDoc = (docId: number) => {
    setUserDocuments(userDocuments.filter(d => d.id !== docId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const selectedCount = selectedResults.length
  const selectedUserDocs = userDocuments.filter(d => d.selected !== false).length
  const totalSelected = selectedCount + selectedUserDocs

  if (generatedReport && showReport) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-10 shadow-2xl shadow-black/5 border border-white/40">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-light text-gray-900">Generated Research Report</h3>
          <div className="flex gap-4">
            <button
              onClick={onDownloadReport}
              className="flex items-center gap-3 px-6 py-3 bg-blue-500 text-white rounded-[1rem] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25 font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Download
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="px-6 py-3 bg-gray-500 text-white rounded-[1rem] hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/25 font-medium"
            >
              Back to Results
            </button>
          </div>
        </div>
        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap font-light leading-relaxed">
          {generatedReport}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-10 shadow-2xl shadow-black/5 border border-white/40">
      <div className="mb-8">
        <h3 className="text-3xl font-light text-gray-900 mb-6">
          Found {searchResults.results.length} results - Select documents for your report
        </h3>
        
        {/* Apple-style Search Info */}
        <div className="bg-blue-50/70 backdrop-blur-sm border-l-4 border-blue-400 p-6 rounded-[1rem] mb-8">
          <p className="text-gray-800 mb-4 font-light text-lg">
            Query: &ldquo;<em>{searchResults.originalQuery}</em>&rdquo; → Google Dork: <code className="bg-blue-100/70 px-3 py-1 rounded-lg text-sm font-mono">{searchResults.dorkQuery}</code>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => selectAllResults(true)}
              className="px-6 py-2 bg-white/70 hover:bg-white border border-gray-200/50 rounded-[1rem] text-sm font-medium text-gray-700 transition-colors backdrop-blur-sm"
            >
              Select All
            </button>
            <button
              onClick={() => selectAllResults(false)}
              className="px-6 py-2 bg-white/70 hover:bg-white border border-gray-200/50 rounded-[1rem] text-sm font-medium text-gray-700 transition-colors backdrop-blur-sm"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Apple-style Results Grid */}
        <div className="space-y-4 mb-10">
          {searchResults.results.map((result, index) => (
            <div key={index} className="flex bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-[1.5rem] p-6 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-400/50 transition-all duration-300">
              <div className="mr-5 pt-1">
                <input
                  type="checkbox"
                  id={`result_${index}`}
                  checked={selectedResults.some(r => r.index === index)}
                  onChange={(e) => toggleResult(index, e.target.checked)}
                  className="w-5 h-5 text-blue-600 cursor-pointer rounded-md"
                />
              </div>
              <div className="flex-1">
                <div
                  className="text-xl font-medium text-blue-600 cursor-pointer hover:text-blue-700 mb-2"
                  onClick={() => window.open(result.link, '_blank')}
                  title="Click to open in new tab"
                >
                  {result.title}
                </div>
                <div className="text-sm text-gray-600 mb-3">{result.formattedUrl || result.displayLink}</div>
                <div className="text-gray-700 text-base leading-relaxed mb-4 font-light">{result.snippet}</div>
                <button
                  onClick={() => window.open(result.link, '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/70 hover:bg-gray-200/70 border border-gray-200/50 rounded-[0.75rem] text-xs text-gray-600 transition-colors backdrop-blur-sm font-medium"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Apple-style Add Documents Section */}
        <div className="bg-gray-50/70 backdrop-blur-sm rounded-[1.5rem] p-8 mb-8">
          <h3 className="text-xl font-medium text-gray-900 mb-6">Add Your Own Documents</h3>
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
              className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-[1rem] transition-colors shadow-lg shadow-blue-500/25 font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Documents
            </button>
            
            {userDocuments.length > 0 && (
              <div className="mt-6 space-y-3">
                {userDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-[1rem] p-4">
                    <input
                      type="checkbox"
                      id={`doc_${doc.id}`}
                      checked={doc.selected !== false}
                      onChange={(e) => toggleUserDoc(doc.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 cursor-pointer mr-4 rounded-md"
                    />
                    <div className="flex-1 text-left">
                      <span className="font-medium text-gray-900 mr-2">{doc.name}</span>
                      <span className="text-sm text-gray-500">{doc.size}</span>
                    </div>
                    <button
                      onClick={() => removeUserDoc(doc.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
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

        {/* Apple-style Generate Report Button */}
        <div className="text-center">
          <button
            onClick={generatedReport ? () => setShowReport(true) : onGenerateReport}
            disabled={!generatedReport && (totalSelected === 0 || isGeneratingReport)}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-[1rem] font-medium transition-colors shadow-lg shadow-blue-600/25 text-lg"
          >
            {isGeneratingReport ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white mr-3"></div>
                Generating...
              </div>
            ) : generatedReport ? (
              'View Generated Report'
            ) : totalSelected === 0 ? (
              'Select items to generate report'
            ) : (
              `Generate Report (${totalSelected} items selected)`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

