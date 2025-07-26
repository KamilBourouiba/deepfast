import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, startIndex = 1, num = 10 } = await request.json()

    // Google Custom Search API limite à 10 résultats max par requête
    const limitedNum = Math.min(num, 10)

    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY
    const GOOGLE_CX = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID
    
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_google_search_api_key_here') {
      return NextResponse.json(
        { error: 'Google Search API key not configured' },
        { status: 500 }
      )
    }
    
    if (!GOOGLE_CX || GOOGLE_CX === 'your_google_custom_search_engine_id_here') {
      return NextResponse.json(
        { error: 'Google Custom Search Engine ID not configured' },
        { status: 500 }
      )
    }

    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CX,
      q: query,
      start: startIndex.toString(),
      num: limitedNum.toString()
    })

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Google Search API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Google Search API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 