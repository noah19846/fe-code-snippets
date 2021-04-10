import axios from 'axios'
import config from './base-config'

const dumbFn = () => {}
const getToken = () => 'token'
// 可能会产生重复并需要取消的请求 map
// 每个 needCancel 为 true 的请求，在创建时就会存到 map 里，在请求完成时即被从 map 里 delete
const requestNeedCancelMap = new Map()
const axiosInstance = axios.create(config)

const DEFAULT_USER_OPTIONS = Object.freeze({
  needToken: true,
  needCancel: false,
  isTokenExpired(res) {
    return false
  },
  onTokenExpired: dumbFn,
  onBefore: dumbFn,
  isSuccess: res => res.status === 200,
  onSuccess: dumbFn,
  onFailed: dumbFn,
  onError: dumbFn,
  onFinally: dumbFn,
  // isSameRequest 接受两个参数，分别为已存在 map 里的 mapValue 和当前的请求的 mapValue
  // 只有在 needCancel 为 true 时且 method 和 url 相同，才会走到 isSameRequest
  // 默认返回 true
  isSameRequest: () => true
})

// 若要在 options 的函数里使用 this，请使用箭头函数或已经绑定好 this 值的函数
async function request(axiosOptions = {}, userOptions = DEFAULT_USER_OPTIONS) {
  if (userOptions !== DEFAULT_USER_OPTIONS) {
    userOptions = {
      ...DEFAULT_USER_OPTIONS,
      ...userOptions
    }
  }

  if (userOptions.needToken) {
    axiosOptions = {
      ...axiosOptions,
      headers: {
        ...axiosOptions.headers,
        token: getToken()
      }
    }
  }

  if (userOptions.needCancel) {
    const source = axios.CancelToken.source()
    const mapKey = `${axiosOptions.method} ${axiosOptions.url}`
    const mapValue = {
      body: axiosOptions.body,
      params: axiosOptions.params,
      cancel: source.cancel
    }

    // 判断是否是相同请求
    if (requestNeedCancelMap.has(mapKey)) {
      const existValue = requestNeedCancelMap.get(mapKey)

      if (userOptions.isSameRequest(existValue, mapValue)) {
        requestNeedCancelMap.get(mapKey).cancel('取消了请求')
      }
    }

    requestNeedCancelMap.set(mapKey, mapValue)
    axiosOptions.cancelToken = source.token
  }

  try {
    const res = await axiosInstance(axiosOptions)

    if (userOptions.needCancel) {
      // delete map 里的对应的 value
      requestNeedCancelMap.delete(`${axiosOptions.method} ${axiosOptions.url}`)
    }

    if (userOptions.isSuccess(res)) {
      userOptions.onSuccess(res.data)

      return res
    }

    if (userOptions.isTokenExpired(res)) {
      userOptions.onTokenExpired(res)

      return Promise.reject(res)
    }

    userOptions.onFailed(res)

    return Promise.reject(res)
  } catch (error) {
    if (!axios.isCancel(error) && userOptions.needCancel) {
      // delete map 里的对应的 value
      requestNeedCancelMap.delete(`${axiosOptions.method} ${axiosOptions.url}`)
    }

    userOptions.onError(error)

    return Promise.reject(error)
  } finally {
    userOptions.onFinally()
  }
}

export default request
