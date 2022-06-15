import type { AxiosRequestConfig } from 'axios'

const basicConfig: AxiosRequestConfig<unknown> = {
  baseURL: '/',
  timeout: 30000,
  headers: { 'X-Custom-Header': 'xxx-yyy' }
}

export default basicConfig
