const ICON_CACHE_KEY = 'loanDashIconCache';

type IconCache = Record<string, string>; // url -> base64 data URL

export function getCachedIcon(url: string): string | null {
  try {
    const cache: IconCache = JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || '{}');
    return cache[url] || null;
  } catch {
    return null;
  }
}

export async function cacheIcon(url: string): Promise<void> {
  if (!url || url.startsWith('data:')) return;
  try {
    const cache: IconCache = JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || '{}');
    if (cache[url]) return; // already cached

    const response = await fetch(url);
    if (!response.ok) return;

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    cache[url] = base64;
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // silently fail — icon just won't be cached
  }
}

export async function cacheIcons(urls: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => !!u && !u.startsWith('data:')))];
  await Promise.allSettled(unique.map(cacheIcon));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
