# 🚀 DeepFastSearch

AI-powered intelligent web search with comprehensive research report generation.

## ✨ Features

- **AI-Optimized Search**: Queries automatically transformed using Google Dorks with Claude AI
- **Interactive Results**: Select specific search results for focused research
- **Custom Sources**: Add your own URLs and upload documents
- **Report Generation**: Create comprehensive research reports with Claude AI
- **Modern UI**: Clean black & white minimalist design
- **Flexible Results**: Choose between 10, 20, 30, or 50 search results
- **Secure API**: Next.js API routes protect your API keys

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **APIs**: Google Custom Search API, Claude (Anthropic) API
- **Architecture**: Next.js App Router with API routes

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repository-url>
cd DeepFastSearch
npm install
```

### 2. Environment Setup

Create a `.env.local` file with your API keys:

```env
# Claude API Key (from Anthropic)
NEXT_PUBLIC_CLAUDE_API_KEY=your_claude_api_key_here

# Google Custom Search API Key
NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here

# Google Custom Search Engine ID
NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID=your_google_custom_search_engine_id_here
```

### 3. Get API Keys

#### Claude API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Generate an API key

#### Google Custom Search
1. **API Key**: Get it at [Google Developers Console](https://console.developers.google.com/)
   - Enable "Custom Search API"
   - Create credentials → API Key

2. **Search Engine ID**: Create at [Google CSE](https://cse.google.com/cse/)
   - Create a new search engine
   - Copy the Search Engine ID

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 How It Works

1. **Search**: Enter your query - it gets AI-optimized with Google Dorks
2. **Select**: Choose relevant search results from the list
3. **Add Sources**: Include your own URLs and documents
4. **Generate**: Create a comprehensive research report with Claude AI

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── claude/       # Claude AI integration
│   │   └── google-search/# Google Search proxy
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application
├── components/           # React components (legacy)
├── lib/                  # Utilities (legacy)
public/
├── ReportPrompt.txt      # Claude prompt for reports
└── SearchPrompt.txt      # Claude prompt for search optimization
```

## 🔧 Configuration

### Search Results Limits
- **10 results**: 1 API call
- **20 results**: 2 API calls  
- **30 results**: 3 API calls
- **50 results**: 5 API calls

*Note: Higher result counts consume more of your Google API quota.*

### Google Dork Optimization
The app automatically transforms queries like:
- `"government PDF documents"` → `filetype:pdf site:.gov government documents`
- `"exposed databases"` → `intitle:"index of" database`
- Custom optimization based on query context

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm run build
npx vercel --prod
```

Add your environment variables in Vercel dashboard.

### Other Platforms

Build the project:

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI
- **Google** for Custom Search API
- **Next.js** team for the amazing framework

---

**Made with ❤️ for better research and information discovery** 