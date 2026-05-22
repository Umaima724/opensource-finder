const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware 
app.use(cors());
app.use(express.json());

// Rate-limiting to avoid hammering GitHub (and us)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api', limiter);

//  Constants 
const GITHUB_API_BASE = 'https://api.github.com';
const ALLOWED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'rust',
  'java', 'c', 'c++', 'c#', 'ruby', 'php', 'swift',
  'kotlin', 'dart', 'elixir', 'haskell', 'scala',
  'shell', 'html', 'css', 'vue', 'svelte'
];

const BEGINNER_LABELS = [
  'good first issue',
  'good-first-issue',
  'beginner friendly',
  'beginner-friendly',
  'first-timers-only',
  'help wanted',
  'easy',
  'low-hanging-fruit',
  'starter-issue',
  'newcomer'
];

const VALID_SORTS = ['stars', 'updated', 'forks'];
const VALID_ORDERS = ['desc', 'asc'];

//  Helpers 
function buildSearchQuery(language, minStars, maxStars, label) {
  const parts = [];

  if (language) {
    parts.push(`language:"${language}"`);
  }

  if (minStars !== undefined && minStars !== '') {
    parts.push(`stars:>=${minStars}`);
  }

  if (maxStars !== undefined && maxStars !== '') {
    parts.push(`stars:<=${maxStars}`);
  }

  // We want repos that have issues with beginner labels
  if (label) {
    parts.push(`label:"${label}"`);
  } else {
    // Default: at least one beginner label present
    parts.push(`label:"good first issue"`);
  }

  parts.push('is:public');
  parts.push('archived:false');

  return parts.join(' ');
}

function validateLanguage(lang) {
  if (!lang) return true;
  return ALLOWED_LANGUAGES.includes(lang.toLowerCase());
}

function validateStars(val) {
  if (val === undefined || val === '') return true;
  const num = Number(val);
  return !isNaN(num) && num >= 0 && num <= 1000000 && Number.isInteger(num);
}

function validateSort(sort) {
  if (!sort) return true;
  return VALID_SORTS.includes(sort);
}

function validateOrder(order) {
  if (!order) return true;
  return VALID_ORDERS.includes(order);
}

//  Routes 

app.get('/api/repos', async (req, res) => {
  try {
    const {
      language,
      minStars,
      maxStars,
      label,
      sort = 'stars',
      order = 'desc',
      per_page = 20,
      page = 1
    } = req.query;

    //  Input validation
    if (language && !validateLanguage(language)) {
      return res.status(400).json({
        error: 'Invalid language parameter.',
        allowed: ALLOWED_LANGUAGES
      });
    }

    if (!validateStars(minStars)) {
      return res.status(400).json({
        error: 'Invalid minStars. Must be an integer between 0 and 1,000,000.'
      });
    }

    if (!validateStars(maxStars)) {
      return res.status(400).json({
        error: 'Invalid maxStars. Must be an integer between 0 and 1,000,000.'
      });
    }

    if (minStars && maxStars && Number(minStars) > Number(maxStars)) {
      return res.status(400).json({
        error: 'minStars cannot be greater than maxStars.'
      });
    }

    if (!validateSort(sort)) {
      return res.status(400).json({
        error: 'Invalid sort. Allowed: stars, updated, forks.'
      });
    }

    if (!validateOrder(order)) {
      return res.status(400).json({
        error: 'Invalid order. Allowed: desc, asc.'
      });
    }

    const perPageNum = Math.min(Math.max(Number(per_page) || 20, 1), 100);
    const pageNum = Math.max(Number(page) || 1, 1);

    const q = buildSearchQuery(language, minStars, maxStars, label);

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'OpenSource-Finder-App'
    };

    // Optional: add GitHub token for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // API call with timeout & retry logic 
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response;
    try {
      response = await axios.get(`${GITHUB_API_BASE}/search/repositories`, {
        params: { q, sort, order, per_page: perPageNum, page: pageNum },
        headers,
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
    clearTimeout(timeout);

    const items = (response.data.items || []).map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      open_issues: repo.open_issues_count,
      updated_at: repo.updated_at,
      created_at: repo.created_at,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
        html_url: repo.owner.html_url
      }
    }));

    return res.json({
      total_count: response.data.total_count || 0,
      page: pageNum,
      per_page: perPageNum,
      items
    });

  } catch (error) {
    console.error('GitHub API Error:', error.message);

    // Edge case: GitHub API rate limit 
    if (error.response?.status === 403 &&
        error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const resetDate = resetTime
        ? new Date(resetTime * 1000).toISOString()
        : 'soon';

      return res.status(429).json({
        error: 'GitHub API rate limit exceeded.',
        message: `Rate limit resets at ${resetDate}. Set a GITHUB_TOKEN env var for higher limits.`,
        reset_at: resetDate
      });
    }

    //  Edge case: GitHub API returns 422 (bad search query) 
    if (error.response?.status === 422) {
      return res.status(400).json({
        error: 'Invalid search query. GitHub rejected the parameters.',
        details: error.response.data?.message || 'Unknown validation error'
      });
    }

    // Edge case: timeout / slow API 
    if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
      return res.status(504).json({
        error: 'GitHub API is too slow or unreachable.',
        message: 'The request timed out after 10 seconds. Please try again later.'
      });
    }

    // Generic error fallback
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Unknown error';

    return res.status(status).json({
      error: 'Failed to fetch repositories from GitHub.',
      message,
      suggestion: 'If this persists, check your internet connection or set a GITHUB_TOKEN for better reliability.'
    });
  }
});


app.get('/api/labels', (_req, res) => {
  res.json({ labels: BEGINNER_LABELS });
});


app.get('/api/languages', (_req, res) => {
  res.json({ languages: ALLOWED_LANGUAGES });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start 
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 GitHub API base: ${GITHUB_API_BASE}`);
  console.log(`🔑 GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? 'set' : 'not set (rate limits will be lower)'}`);
});