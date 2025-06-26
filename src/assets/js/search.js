// Search functionality using Fuse.js
(function() {
  let searchIndex = null;
  let fuse = null;
  let searchInput = null;
  let searchResults = null;
  let isSearchLoaded = false;

  // Initialize search when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    // Load search index on first focus
    searchInput.addEventListener('focus', loadSearchIndex, { once: true });
    
    // Set up search handlers
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keydown', handleSearchKeydown);
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  });

  // Load search index and initialize Fuse.js
  async function loadSearchIndex() {
    if (isSearchLoaded) return;
    
    try {
      // Determine the correct path based on current location
      const isInChapter = window.location.pathname.includes('/chapters/');
      const searchIndexPath = isInChapter ? '../assets/data/search-index.json' : 'assets/data/search-index.json';
      
      const response = await fetch(searchIndexPath);
      searchIndex = await response.json();
      
      // Initialize Fuse.js with options
      fuse = new Fuse(searchIndex, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'content', weight: 0.3 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2
      });
      
      isSearchLoaded = true;
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  // Handle search input
  function handleSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      searchResults.innerHTML = '';
      searchResults.classList.remove('active');
      return;
    }
    
    if (!fuse) {
      searchResults.innerHTML = '<div class="search-loading">Loading search...</div>';
      searchResults.classList.add('active');
      return;
    }
    
    // Perform search
    const results = fuse.search(query).slice(0, 10); // Limit to 10 results
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      searchResults.classList.add('active');
      return;
    }
    
    // Render results
    const resultsHtml = results.map((result, index) => {
      const item = result.item;
      const snippet = getSnippet(item.content, query);
      
      // Adjust URL based on current location
      const isInChapter = window.location.pathname.includes('/chapters/');
      const url = isInChapter ? `../${item.url}` : item.url;
      
      return `
        <a href="${url}" class="search-result" data-index="${index}">
          <div class="search-result-title">${highlightText(item.title, query)}</div>
          <div class="search-result-snippet">${snippet}</div>
        </a>
      `;
    }).join('');
    
    searchResults.innerHTML = resultsHtml;
    searchResults.classList.add('active');
  }

  // Handle keyboard navigation in search results
  function handleSearchKeydown(e) {
    const results = searchResults.querySelectorAll('.search-result');
    if (results.length === 0) return;
    
    let currentIndex = Array.from(results).findIndex(r => r.classList.contains('selected'));
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        e.preventDefault();
        currentIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
        break;
      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0) {
          results[currentIndex].click();
        }
        return;
      case 'Escape':
        e.preventDefault();
        searchInput.blur();
        searchResults.classList.remove('active');
        return;
      default:
        return;
    }
    
    // Update selected result
    results.forEach((r, i) => {
      r.classList.toggle('selected', i === currentIndex);
    });
    
    // Scroll into view if needed
    if (currentIndex >= 0) {
      results[currentIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // Get snippet with context around the query
  function getSnippet(content, query) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) {
      return content.substring(0, 150) + '...';
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 100);
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return highlightText(snippet, query);
  }

  // Highlight matching text
  function highlightText(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Escape regex special characters
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
})();