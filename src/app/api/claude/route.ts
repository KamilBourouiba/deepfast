import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userQuery, systemPrompt, maxTokens = 4000 } = await request.json()

    const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY
    
    if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your_claude_api_key_here') {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userQuery
        }],
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Claude API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Claude API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 