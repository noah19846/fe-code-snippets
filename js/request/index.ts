import type { AxiosRequestConfig } from 'axios'
import type { Router } 'vue-router'

import axios from 'axios'
import basicConfig from './axios-config'
import RequestManager from '../request-manager'

// add userConfig to AxiosRequestConfig to avoid ts error
declare module 'axios' {
  export interface AxiosRequestConfig {
    userConfig?: UserConfig
  }
}

type APIResponse = {
  code: number
}
type DoWhatever = (..._: Array<unknown>) => void
type ValidateByAPIResponse = (res: APIResponse) => boolean
type LoginExpiredValidator = ValidateByAPIResponse
type DataSuccessValidator = ValidateByAPIResponse
type LoginExpiredCb = DoWhatever
type BeforeRequestCb = DoWhatever
type RequestSuccessfulCb = DoWhatever
type RequestFailedCb = DoWhatever
type RequestErrorCb = DoWhatever
type AfterRequestCb = DoWhatever
type GetTokenKeyValuePair = (_?: unknown) => [string, string]

export type UserConfig = {
  path?: string // 有 path 时说明需要在切换路由时取消请求
  needToken?: boolean
  needDeDuplicate?: boolean
  getToken?: GetTokenKeyValuePair
  isLoginExpired?: LoginExpiredValidator
  isSuccess?: DataSuccessValidator
  onLoginExpired?: LoginExpiredCb
  onBefore?: BeforeRequestCb
  onSuccess?: RequestSuccessfulCb
  onFailed?: RequestFailedCb
  onError?: RequestErrorCb
  onFinally?: AfterRequestCb
}

type CreateUnOptionalUserConfig<T> = {
  [P in keyof T as Exclude<P, 'path'>]-?: T[P]
}

const doWhatever: DoWhatever = () => {
  //
}
const USER_DEFAULT_CONFIG: CreateUnOptionalUserConfig<UserConfig> = {
  needToken: false,
  needDeDuplicate: false,
  isLoginExpired: () => false,
  getToken: () => ['token', ''],
  isSuccess: (res) => res.code === 200 || true,
  onLoginExpired: doWhatever,
  onBefore: doWhatever,
  onSuccess: doWhatever,
  onFailed: doWhatever,
  onError: doWhatever,
  onFinally: doWhatever
}

const requestCreator = (router?: Router) => {
  const rM = new RequestManager(router)
  const axiosInstance = axios.create(basicConfig)

  axiosInstance.interceptors.request.use((cfg) => {
    const userCfg = { ...USER_DEFAULT_CONFIG, ...cfg.userConfig }

    if (userCfg.needToken && userCfg.getToken) {
      const [key, value] = userCfg.getToken()

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      cfg.headers![key] = value
    }

    cfg.userConfig = userCfg
    userCfg.onBefore(cfg)

    return cfg
  })

  axiosInstance.interceptors.response.use(
    (response) => {
      const userCfg = response.config
        .userConfig as CreateUnOptionalUserConfig<UserConfig>

      // remove the controller from map when resolve
      if (userCfg.needDeDuplicate) {
        rM.removeControllerByReq(
          `${response.config.method}-${response.config.url}`
        )
      }

      const data = response.data

      if (userCfg.isSuccess(data)) {
        userCfg.onSuccess(data)
        userCfg.onFinally(data)

        return data
      }

      if (userCfg.isLoginExpired(data)) {
        userCfg.onLoginExpired(data)
      }

      userCfg.onFailed(data)
      userCfg.onFinally(data)

      return Promise.reject(response)
    },
    (err) => {
      const userCfg = {
        ...USER_DEFAULT_CONFIG,
        ...err?.config?.userCfg
      }
      // remove the controller from map when reject
      if (err.isAxiosError && err.config && userCfg.needDeDuplicate) {
        rM.removeControllerByReq(`${err.config.method}-${err.config.url}`)
      }

      userCfg.onError(err)
      userCfg.onFinally(err)

      return Promise.reject(err)
    }
  )

  return (config: AxiosRequestConfig) => {
    // to make config.userConfig be CreateUnOptionalUserConfig<UserConfig>
    const userCfg = { ...USER_DEFAULT_CONFIG, ...config.userConfig }

    if ((userCfg.path && router) || userCfg.needDeDuplicate) {
      const ctl = new AbortController()

      if (userCfg.needDeDuplicate) {
        const reqStr = `${(config?.method || 'get').toLowerCase()}-${
          config.url
        }`

        // remove and abort, if there is already a same request
        rM.removeControllerByReq(reqStr, true)
        rM.addController2ReqMap(reqStr, ctl)
      }

      if (userCfg.path && router) {
        rM.addController2PathMap(userCfg.path, ctl)
      }

      config.signal = ctl.signal
    }

    return axiosInstance(config)
  }
}

export default requestCreator
