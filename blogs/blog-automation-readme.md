# Blog Automation

Automated blog pipeline that generates AI-powered book summaries and publishes them to GitHub Pages.

**Pipeline:** Google Drive → Hugging Face AI → GitHub Pages

## Overview

This project automates the entire workflow of creating and publishing blog posts:

1. **Select** a random book from the books list
2. **Generate** an AI-powered summary using the Hugging Face API
3. **Template** the output as HTML
4. **Publish** to GitHub Pages

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)
- **Hugging Face API Token** ([get one here](https://huggingface.co/settings/tokens))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blog-automation
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```env
HF_TOKEN=hf_your_token_here
GITHUB_OWNER=github_username_here
GITHUB_REPO=github_repo_name_here
GITHUB_TOKEN=github_pat_123...
```

## Usage

### Run the Pipeline

Generate a blog post, send to Hugging Face AI, and publish to GitHub:
```bash
node src/index.js
```

Or use npm:
```bash
npm run test:local
```

**Optional:** Override the Hugging Face token:
```bash
node src/index.js --token hf_xxx
```

### Available Scripts

- `npm run test:local` — Run the full pipeline (generates and publishes one blog post)

## Project Structure

```
blog-automation/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js             # Environment & configuration
│   ├── books.js              # Book selection & management
│   ├── promptBuilder.js      # LLM prompt construction
│   ├── hfClient.js           # Hugging Face API client
│   ├── templateEngine.js     # HTML template rendering
│   └── github.js             # GitHub upload utility
├── templates/
│   └── Books-Template.html   # HTML template for blog posts
├── css/
│   └── books-blog.css        # Blog styling
├── output/
│   └── *.html                # Generated blog posts
├── package.json              # Project dependencies
├── .env                      # Environment variables (not in repo)
└── README.md                 # This file
```

## Configuration

All configuration is managed in [src/config.js](src/config.js):

- **HF_TOKEN** — Hugging Face API token (required)
- **PATHS** — File paths for templates, books, and output
- **API_CONSTANTS** — Hugging Face model and endpoint settings

## How It Works

### 1. Book Selection
[src/books.js](src/books.js) picks a random book and permanently removes it from the list to avoid duplicates.

### 2. Prompt Building
[src/promptBuilder.js](src/promptBuilder.js) constructs a structured prompt for the LLM with book details (title, author, etc.).

### 3. API Call
[src/hfClient.js](src/hfClient.js) calls the Hugging Face API and retrieves an AI-generated summary.

### 4. Template Rendering
[src/templateEngine.js](src/templateEngine.js):
- Extracts JSON from the API response
- Fills [templates/Books-Template.html](templates/Books-Template.html) with the data
- Strips development comments from the output

### 5. GitHub Upload
[src/github.js](src/github.js) commits and pushes the generated HTML to GitHub Pages.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` | Yes | Hugging Face API authentication token |
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token for publishing |
| `GITHUB_OWNER` | Yes | GitHub username or organization name |
| `GITHUB_REPO` | Yes | GitHub repository name where blog posts are published |

## Dependencies

| Package | Version | Purpose |
|---------|---------|----------|
| `dotenv` | ^17.4.2 | Environment variable loading |

**Note:** This project uses Node.js built-in modules (fs, path, etc.) and the native Fetch API.

## Error Handling

- Missing `HF_TOKEN` → exits with clear error message
- Invalid JSON from API → logs raw model output for debugging
- File I/O errors → caught and reported

## Development

To test locally:
```bash
npm run test:local
```

## License

[Add license information here]

## Contributing

[Add contribution guidelines here]
