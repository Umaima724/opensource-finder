import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const LANGUAGES = [
  'Any', 'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust',
  'Java', 'C', 'C++', 'C#', 'Ruby', 'PHP', 'Swift',
  'Kotlin', 'Dart', 'Elixir', 'Haskell', 'Scala',
  'Shell', 'HTML', 'CSS', 'Vue', 'Svelte'
];

const LABELS = [
  'good first issue', 'good-first-issue', 'beginner friendly',
  'beginner-friendly', 'first-timers-only', 'help wanted',
  'easy', 'low-hanging-fruit', 'starter-issue', 'newcomer'
];

const SORTS = [
  { value: 'stars', label: 'Stars' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'forks', label: 'Forks' }
];

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function App() {
  const [language, setLanguage] = useState('Any');
  const [minStars, setMinStars] = useState('');
  const [maxStars, setMaxStars] = useState('');
  const [label, setLabel] = useState('good first issue');
  const [sort, setSort] = useState('stars');
  const [order, setOrder] = useState('desc');

  const [repos, setRepos] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiSlow, setApiSlow] = useState(false);

  const fetchRepos = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    setApiSlow(false);

    const params = new URLSearchParams();
    if (language !== 'Any') params.append('language', language.toLowerCase());
    if (minStars) params.append('minStars', minStars);
    if (maxStars) params.append('maxStars', maxStars);
    params.append('label', label);
    params.append('sort', sort);
    params.append('order', order);
    params.append('per_page', perPage);
    params.append('page', pageNum);

    // Slow-API warning timer
    const slowTimer = setTimeout(() => setApiSlow(true), 3000);

    try {
      const res = await fetch(`${API_BASE}/api/repos?${params.toString()}`);
      clearTimeout(slowTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setRepos(data.items || []);
      setTotalCount(data.total_count || 0);
      setPage(pageNum);
    } catch (err) {
      clearTimeout(slowTimer);
      setError(err.message);
      setRepos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setApiSlow(false);
    }
  }, [language, minStars, maxStars, label, sort, order, perPage]);

  useEffect(() => {
    fetchRepos(1);
  }, [fetchRepos]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🌱 Open Source Project Finder</h1>
        <p style={styles.subtitle}>
          Discover beginner-friendly repositories to start your open-source journey
        </p>
      </header>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Language</label>
          <select
            style={styles.select}
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Min Stars</label>
          <input
            type="number"
            style={styles.input}
            placeholder="e.g. 50"
            value={minStars}
            onChange={e => setMinStars(e.target.value)}
            min="0"
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Max Stars</label>
          <input
            type="number"
            style={styles.input}
            placeholder="e.g. 5000"
            value={maxStars}
            onChange={e => setMaxStars(e.target.value)}
            min="0"
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Issue Label</label>
          <select
            style={styles.select}
            value={label}
            onChange={e => setLabel(e.target.value)}
          >
            {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Sort By</label>
          <select
            style={styles.select}
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Order</label>
          <select
            style={styles.select}
            value={order}
            onChange={e => setOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <button
          style={styles.searchBtn}
          onClick={() => fetchRepos(1)}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Status messages */}
      {apiSlow && (
        <div style={styles.warnBanner}>
          ⏳ GitHub API is responding slowly… hang tight!
        </div>
      )}

      {error && (
        <div style={styles.errorBanner}>
          <strong>Error:</strong> {error}
          <button style={styles.retryBtn} onClick={() => fetchRepos(page)}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {!error && repos.length === 0 && !loading && (
        <div style={styles.empty}>No repositories found. Try loosening your filters.</div>
      )}

      {repos.length > 0 && (
        <>
          <div style={styles.resultMeta}>
            Found <strong>{formatNumber(totalCount)}</strong> repositories
            {totalCount > perPage && ` · Page ${page} of ${totalPages}`}
          </div>

          <div style={styles.grid}>
            {repos.map(repo => (
              <div key={repo.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    style={styles.avatar}
                    loading="lazy"
                  />
                  <div style={styles.cardTitleWrap}>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.repoName}
                    >
                      {repo.full_name}
                    </a>
                    <span style={styles.langBadge}>
                      {repo.language || 'Unknown'}
                    </span>
                  </div>
                </div>

                <p style={styles.description}>
                  {repo.description || 'No description provided.'}
                </p>

                <div style={styles.statsRow}>
                  <span style={styles.stat}>⭐ {formatNumber(repo.stars)}</span>
                  <span style={styles.stat}>🍴 {formatNumber(repo.forks)}</span>
                  <span style={styles.stat}>🐛 {formatNumber(repo.open_issues)} open</span>
                </div>

                <div style={styles.footerRow}>
                  <span style={styles.updated}>Updated {timeAgo(repo.updated_at)}</span>
                  <a
                    href={`${repo.html_url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22${encodeURIComponent(label)}%22`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.issuesLink}
                  >
                    View Issues →
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageBtn}
                disabled={page <= 1 || loading}
                onClick={() => fetchRepos(page - 1)}
              >
                ← Prev
              </button>
              <span style={styles.pageInfo}>Page {page} / {totalPages}</span>
              <button
                style={styles.pageBtn}
                disabled={page >= totalPages || loading}
                onClick={() => fetchRepos(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <footer style={styles.footer}>
        Built with ❤️ for beginners · Uses the GitHub Search API
      </footer>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 700,
    color: '#f0f6fc',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#8b949e',
    margin: 0,
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 20,
    background: '#161b22',
    borderRadius: 12,
    border: '1px solid #30363d',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 140,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #30363d',
    background: '#0d1117',
    color: '#c9d1d9',
    fontSize: '0.95rem',
    cursor: 'pointer',
    outline: 'none',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #30363d',
    background: '#0d1117',
    color: '#c9d1d9',
    fontSize: '0.95rem',
    outline: 'none',
    width: 120,
  },
  searchBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: '#238636',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  warnBanner: {
    padding: '12px 16px',
    borderRadius: 8,
    background: '#bb800926',
    color: '#d29922',
    border: '1px solid #bb800933',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBanner: {
    padding: '16px',
    borderRadius: 8,
    background: '#f8514926',
    color: '#f85149',
    border: '1px solid #f8514933',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  retryBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid #f85149',
    background: 'transparent',
    color: '#f85149',
    cursor: 'pointer',
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: '48px 16px',
    color: '#8b949e',
    fontSize: '1.1rem',
  },
  resultMeta: {
    marginBottom: 16,
    color: '#8b949e',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'border-color 0.2s, transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '2px solid #30363d',
  },
  cardTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  repoName: {
    color: '#58a6ff',
    fontWeight: 600,
    fontSize: '1rem',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  langBadge: {
    fontSize: '0.75rem',
    color: '#8b949e',
    background: '#21262d',
    padding: '2px 8px',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#8b949e',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    fontSize: '0.85rem',
    color: '#8b949e',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
    borderTop: '1px solid #21262d',
  },
  updated: {
    fontSize: '0.8rem',
    color: '#6e7681',
  },
  issuesLink: {
    fontSize: '0.85rem',
    color: '#58a6ff',
    textDecoration: 'none',
    fontWeight: 500,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
  },
  pageBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #30363d',
    background: '#21262d',
    color: '#c9d1d9',
    cursor: 'pointer',
    fontWeight: 500,
  },
  pageInfo: {
    color: '#8b949e',
    fontSize: '0.9rem',
  },
  footer: {
    textAlign: 'center',
    marginTop: 48,
    color: '#484f58',
    fontSize: '0.85rem',
  },
};