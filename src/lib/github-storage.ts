// GitHub repo tabanlı medya depolama
// Dosyalar public bir GitHub reposuna yuklenir ve raw.githubusercontent.com uzerinden sunulur

const GITHUB_API = "https://api.github.com";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

function getConfig(): GitHubConfig {
  const token = process.env.GITHUB_STORAGE_TOKEN;
  const owner = process.env.GITHUB_STORAGE_OWNER;
  const repo = process.env.GITHUB_STORAGE_REPO;

  if (!token || !owner || !repo) {
    throw new Error("GITHUB_STORAGE_TOKEN, GITHUB_STORAGE_OWNER ve GITHUB_STORAGE_REPO gerekli");
  }

  return { token, owner, repo };
}

function getCdnUrl(owner: string, repo: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
}

export async function uploadToGitHub(
  fileBuffer: Buffer,
  fileName: string,
  folder: string
): Promise<string> {
  const config = getConfig();
  const filePath = `${folder}/${fileName}`;
  const content = fileBuffer.toString("base64");

  const res = await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `media: ${fileName}`,
        content,
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`GitHub upload failed: ${res.status} ${JSON.stringify(error)}`);
  }

  return getCdnUrl(config.owner, config.repo, filePath);
}

export async function deleteFromGitHub(fileUrl: string): Promise<void> {
  const config = getConfig();

  // URL'den dosya yolunu cikart
  const prefix = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main/`;
  if (!fileUrl.startsWith(prefix)) return;

  const filePath = fileUrl.slice(prefix.length);

  // Once dosyanin SHA'sini al (silmek icin gerekli)
  const getRes = await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!getRes.ok) return; // Dosya zaten yok

  const fileData = await getRes.json();

  await fetch(
    `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${filePath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `delete: ${filePath}`,
        sha: fileData.sha,
      }),
    }
  );
}

export function isGitHubStorageConfigured(): boolean {
  return !!(
    process.env.GITHUB_STORAGE_TOKEN &&
    process.env.GITHUB_STORAGE_OWNER &&
    process.env.GITHUB_STORAGE_REPO
  );
}
