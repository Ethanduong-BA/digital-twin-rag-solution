# Digital Twin MCP Server

MCP (Model Context Protocol) Server cho phép AI analyze profile của bạn so với các job description.

## 📋 Tool: `compare_profile_with_job`

Compares your profile against a job description and provides detailed analysis.

### Input
```json
{
  "job_filename": "week3-job01-the-star-entertainment-group-data-analyst.md"
}
```

### Output
```json
{
  "jobTitle": "Data Analyst",
  "company": "The Star Entertainment Group",
  "matchPoints": [
    {
      "skill": "SQL/Database",
      "description": "You have demonstrated SQL/Database experience",
      "proficiency": "expert"
    },
    {
      "skill": "Data Analysis",
      "description": "You have demonstrated Data Analysis experience",
      "proficiency": "intermediate"
    }
  ],
  "gapPoints": [
    {
      "skill": "Power BI/Tableau",
      "importance": "critical",
      "reason": "Required for role: Data Analyst"
    }
  ],
  "matchPercentage": 75,
  "overallScore": 8,
  "strengths": ["SQL/Database", "Data Analysis", "Python"],
  "areasToImprove": ["Power BI/Tableau", "Excel"],
  "recommendation": "Good candidate for Data Analyst. You have most key skills. Focus on addressing the gaps before applying."
}
```

## 🚀 Setup & Installation

```bash
# Navigate to MCP server directory
cd mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start
```

## 📦 File Structure

```
mcp-server/
├── index.ts              # MCP Server entry point
├── server.ts             # Tool definition & logic
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md             # This file
```

## 🔧 How It Works

1. **Tool Definition** (`compareProfileWithJobTool`)
   - Defines the tool schema for MCP clients
   - Input: job_filename

2. **File Reading**
   - Reads job description from `jobs/` folder
   - Reads user profile from `data/my-profile.md` or `data-pipeline/raw_data/profile.json`

3. **Analysis Logic**
   - Keyword matching against 12+ skill categories
   - Proficiency level detection
   - Importance assessment
   - Score calculation (1-10)

4. **Result Generation**
   - Match points (skills you have)
   - Gap points (skills you lack)
   - Overall score & recommendation
   - Strengths & areas to improve

## 📊 Skill Categories Analyzed

### Technical Skills
- SQL/Database
- Power BI/Tableau
- Excel
- Python
- Data Analysis
- ETL/Data Pipeline
- Statistics
- Data Visualization

### Soft Skills
- Communication
- Problem Solving
- Attention to Detail
- Adaptability

## 🎯 Scoring Logic

- **9-10**: Excellent fit (highly competitive)
- **7-8**: Good candidate (apply with confidence)
- **5-6**: Moderate match (develop gaps first)
- **1-4**: Challenging role (gain experience first)

## 📁 Required Directory Structure

```
digital-twin-rag-solution/
├── jobs/                    # Job descriptions (MD files)
│   └── week3-job*.md
├── data/                    # User profile (optional)
│   └── my-profile.md
└── data-pipeline/           # Alternative profile location
    └── raw_data/
        └── profile.json
```

## 🤝 Integration with AI Clients

Use with Anthropic Claude or other MCP-compatible clients:

```javascript
// Example usage in client code
const result = await mcpClient.callTool("compare_profile_with_job", {
  job_filename: "week3-job01-the-star-entertainment-group-data-analyst.md"
});

console.log(`Match: ${result.matchPercentage}%`);
console.log(`Score: ${result.overallScore}/10`);
console.log(`Recommendation: ${result.recommendation}`);
```

## 🔍 Example Job Files

Available in `jobs/` folder:
- `week3-job01-the-star-entertainment-group-data-analyst.md`
- `week3-job02-capgemini-data-analyst.md`
- `week3-job03-the-star-entertainment-group-uiux-designer.md`
- `week3-job04-hays-data-analyst.md`
- `week3-job05-move-recruitment-data-analyst.md`

## 🛠️ Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Debug
Set `DEBUG=mcp:*` environment variable for verbose logging.

## 📝 Customization

To add more skills for analysis, modify the `skillKeywords` object in `server.ts`:

```typescript
const skillKeywords = {
  "Your Skill": {
    keywords: ["keyword1", "keyword2"],
    weight: 2
  }
};
```

## ⚠️ Limitations

- Profile matching uses keyword-based analysis (not AI-powered semantic matching)
- Requires profile to be in Markdown or JSON format
- Job files must be in Markdown format
- Scoring is relative (not absolute)

## 🚀 Future Enhancements

- [ ] Add semantic analysis using embeddings
- [ ] Support more profile formats (PDF, DOCX)
- [ ] Multi-language support
- [ ] Integration with LinkedIn API
- [ ] Detailed skills proficiency assessment
- [ ] Career path recommendations

---

**Status**: Ready for deployment  
**Last Updated**: Feb 11, 2026
