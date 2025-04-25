import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const useUrlState = (paramName: string, defaultValue = '') => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialValue = searchParams.get(paramName) || defaultValue
  const [state, setState] = useState(initialValue)

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    if (state === defaultValue) {
      newSearchParams.delete(paramName)
    } else {
      newSearchParams.set(paramName, state)
    }
    setSearchParams(newSearchParams)
  }, [state, paramName, searchParams, setSearchParams, defaultValue])

  return [state, setState] as const
}

export default useUrlState
