export function extractRepoFromUrl(url: string) {
  const parts = url.split('/')
  const baseIndex = parts.findIndex((str) => str.toLowerCase() === 'github.com')
  if (baseIndex === -1) {
    return {
      owner: '',
      repo: '',
      error: 'Invalid Link',
    }
  }
  const owner = parts[baseIndex + 1]
  const repo = parts[baseIndex + 2]
  return {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    error: '',
  }
}
