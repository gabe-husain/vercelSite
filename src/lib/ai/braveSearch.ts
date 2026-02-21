type BraveSearchResult = {
  title: string
  url: string
  description: string
}

export async function braveWebSearch(
  query: string,
): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return [
      {
        title: 'Error',
        url: '',
        description: 'Brave Search API key not configured',
      },
    ]
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '3')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!response.ok) {
      return [
        {
          title: 'Error',
          url: '',
          description: `Brave Search returned ${response.status}`,
        },
      ]
    }

    const data = await response.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.web?.results || []).slice(0, 3).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
    }))
  } catch (err) {
    return [
      {
        title: 'Error',
        url: '',
        description: `Brave Search failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      },
    ]
  }
}
