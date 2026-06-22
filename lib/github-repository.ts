import "server-only"

import { repositoryFiles } from "@/lib/devguardian-data"

export interface RepositoryScan {
  source: "github" | "demo"
  name: string
  owner: string
  url: string
  defaultBranch: string
  stars: number
  openIssues: number
  languages: Record<string, number>
  files: Array<{ path: string; owner: string; risk: string; status: string }>
  summary: string
}

function parseGitHubUrl(input: string) {
  const match = input.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  if (!match) return null
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
  }
}

function demoScan(input: string): RepositoryScan {
  return {
    source: "demo",
    name: input ? input.replace(/^https?:\/\//, "") : "demo/repository",
    owner: "demo",
    url: input || "https://github.com/demo/repository",
    defaultBranch: "main",
    stars: 128,
    openIssues: 4,
    languages: { TypeScript: 72, CSS: 18, JavaScript: 10 },
    files: repositoryFiles,
    summary: "Demo scan loaded. Connect a public GitHub repository to inspect live metadata and protected files.",
  }
}

export async function scanRepository(input: string): Promise<RepositoryScan> {
  const parsed = parseGitHubUrl(input)
  if (!parsed) return demoScan(input)

  try {
    const headers: HeadersInit = process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}
    const [repoResponse, languagesResponse, contentsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers, cache: "no-store" }),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`, { headers, cache: "no-store" }),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents`, { headers, cache: "no-store" }),
    ])

    if (!repoResponse.ok) return demoScan(input)

    const repo = await repoResponse.json()
    const languages = languagesResponse.ok ? await languagesResponse.json() : {}
    const contents = contentsResponse.ok ? await contentsResponse.json() : []
    const files = Array.isArray(contents)
      ? contents.slice(0, 8).map((item: { path: string; type: string }) => ({
          path: item.path,
          owner: item.type === "dir" ? "planner" : "code",
          risk: item.path.match(/auth|secret|env|deploy|api/i) ? "high" : "medium",
          status: item.type === "dir" ? "tracked" : "protected",
        }))
      : repositoryFiles

    return {
      source: "github",
      name: repo.name,
      owner: repo.owner?.login || parsed.owner,
      url: repo.html_url || input,
      defaultBranch: repo.default_branch || "main",
      stars: repo.stargazers_count || 0,
      openIssues: repo.open_issues_count || 0,
      languages,
      files,
      summary: "Live GitHub metadata loaded and mapped into DevGuardian protected-resource inventory.",
    }
  } catch {
    return demoScan(input)
  }
}

