import { describe, it, expect } from 'vitest'
import { extractRepoFromUrl } from './githubUtils'

describe('extractRepoFromUrl', () => {
  it('should parse a url with https://', () => {
    const url = 'https://github.com/some-person/some-app'
    const result = extractRepoFromUrl(url)
    expect(result.error).toBeFalsy()
    expect(result.owner).toBe('some-person')
    expect(result.repo).toBe('some-app')
  })
  it('should parse a url without https://', () => {
    const url = 'github.com/some-person/some-app'
    const result = extractRepoFromUrl(url)
    expect(result.error).toBeFalsy()
    expect(result.owner).toBe('some-person')
    expect(result.repo).toBe('some-app')
  })
  it('should parse a url with weird capitolization', () => {
    const url = 'giThUb.com/soMe-person/sOme-app'
    const result = extractRepoFromUrl(url)
    expect(result.error).toBeFalsy()
    expect(result.owner).toBe('some-person')
    expect(result.repo).toBe('some-app')
  })
})
