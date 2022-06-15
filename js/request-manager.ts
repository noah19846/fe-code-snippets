import type { Router } from 'vue-router'

class RequestManager {
  private readonly path2ControllersMap: Map<string, Array<AbortController>>
  private readonly req2ControllerMap: Map<string, AbortController>

  constructor(vueRouter?: Router) {
    this.path2ControllersMap = new Map()
    this.req2ControllerMap = new Map()

    if (vueRouter) {
      vueRouter.afterEach((_, { path }) => {
        this.abortControllersBypath(path)
      })
    }
  }

  getControllerByReq(req: string) {
    return this.req2ControllerMap.get(req)
  }

  removeControllerByReq(req: string, abortFirst?: boolean) {
    const ctl = this.getControllerByReq(req)

    if (ctl) {
      if (abortFirst) {
        ctl.abort()
      }

      this.req2ControllerMap.delete(req)
    }
  }

  addController2ReqMap(req: string, ctl: AbortController) {
    this.req2ControllerMap.set(req, ctl)
  }

  addController2PathMap(path: string, c: AbortController) {
    const list = this.path2ControllersMap.get(path)

    if (list) {
      list.push(c)
    } else {
      this.path2ControllersMap.set(path, [c])
    }
  }

  removeControllerByPath(path: string, c: AbortController) {
    const list = this.path2ControllersMap.get(path)

    if (list) {
      const index = list.indexOf(c)

      if (index !== -1) {
        list.splice(index, 1)
      }
    }
  }

  abortControllersBypath(path: string) {
    const list = this.path2ControllersMap.get(path)

    if (list) {
      list.forEach((c) => c.abort())
      this.path2ControllersMap.delete(path)
    }
  }
}

export default RequestManager
