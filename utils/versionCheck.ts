export const GITHUB_REPO = 'hamzamix/LoandashMobile';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const CURRENT_VERSION = '1.1.6';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  available: boolean;
  latestVersion: string;
  currentVersion: string;
  htmlUrl: string;
  apkUrl: string | null;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const lastCheck = localStorage.getItem('loanDashLastUpdateCheck');
  const now = Date.now();

  if (lastCheck && now - parseInt(lastCheck, 10) < CHECK_INTERVAL) {
    const cached = localStorage.getItem('loanDashUpdateInfo');
    if (cached) return JSON.parse(cached);
    return null;
  }

  try {
    const response = await fetch(GITHUB_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const release = await response.json();
    const tagName: string = release.tag_name || '';
    const latestVersion = tagName.replace(/^v/, '').trim();

    if (!latestVersion) return null;

    const current = CURRENT_VERSION.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);

    let available = false;
    for (let i = 0; i < 3; i++) {
      if ((latest[i] || 0) > (current[i] || 0)) {
        available = true;
        break;
      }
      if ((latest[i] || 0) < (current[i] || 0)) break;
    }

    const apkAsset = (release.assets || []).find((a: any) => 
      a.name?.endsWith('.apk') && a.browser_download_url
    );

    const info: UpdateInfo = {
      available,
      latestVersion,
      currentVersion: CURRENT_VERSION,
      htmlUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      apkUrl: apkAsset?.browser_download_url || null,
    };

    localStorage.setItem('loanDashUpdateInfo', JSON.stringify(info));
    localStorage.setItem('loanDashLastUpdateCheck', now.toString());

    return info;
  } catch {
    return null;
  }
}
