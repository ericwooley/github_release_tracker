import { Octokit } from 'octokit'
export class GithubSearchRepositories {
  private octokit: Octokit
  constructor(accessKey?: string) {
    this.octokit = new Octokit({})
  }

  async searchRepositories(query: string) {
    const result = await this.octokit.rest.search.repos({
      q: query,
      sort: 'stars',
      page: 0,
      per_page: 10,
    })
    return result.data.items.map(({ html_url, name, description, id, private: p }) => ({
      url: html_url,
      name,
      description,
      id,
      private: p,
    }))
  }
}
