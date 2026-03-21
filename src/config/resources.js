export async function fetchResources(searchQueries) {
    const allResources = await Promise.all(
      searchQueries.map(async (query) => {
        const [youtube, devto, serper] = await Promise.allSettled([
          fetchYouTube(query),
          fetchDevTo(query),
          fetchSerper(query)
        ]);
  
        return [
          ...(youtube.status === 'fulfilled' ? youtube.value : []),
          ...(devto.status   === 'fulfilled' ? devto.value   : []),
          ...(serper.status  === 'fulfilled' ? serper.value  : []),
        ];
      })
    );
  
    return allResources.flat();
  }
  
  async function fetchYouTube(query) {
    if (!process.env.YOUTUBE_API_KEY) return [];
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
    );
    if (!res.ok) throw new Error("YouTube API failed");
    const data = await res.json();
    return (data.items || []).map(v => ({
      title: v.snippet.title,
      url: `https://youtube.com/watch?v=${v.id.videoId}`,
      type: 'video',
      source: 'youtube',
      thumbnail: v.snippet.thumbnails?.medium?.url
    }));
  }
  
  async function fetchDevTo(query) {
    const tag = query.toLowerCase().replace(/\s+/g, '-');
    const res = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=3`);
    if (!res.ok) throw new Error("Dev.to API failed");
    const data = await res.json();
    return data.map(a => ({
      title: a.title,
      url: a.url,
      type: 'article',
      source: 'dev.to',
      thumbnail: a.cover_image
    }));
  }
  
  async function fetchSerper(query) {
    if (!process.env.SERPER_API_KEY) return [];
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.SERPER_API_KEY
      },
      body: JSON.stringify({ q: query, num: 3 })
    });
    if (!res.ok) throw new Error("Serper API failed");
    const data = await res.json();
    return (data.organic || []).map(r => ({
      title: r.title,
      url: r.link,
      type: 'article',
      source: 'web',
      thumbnail: null
    }));
  }
