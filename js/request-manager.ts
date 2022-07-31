import type { Router } from 'vue-router'

class RequestManager {
  private readonly req2ControllerMap: Map<string, AbortController>
  private readonly controllerSetOfAbortingWithRoute: Set<AbortController>

  constructor(vueRouter?: Router) {
    this.req2ControllerMap = new Map()
    this.controllerSetOfAbortingWithRoute = new Set()

    if (vueRouter) {
      vueRouter.afterEach(() => {
        this.cleanControllerSet()
      })
    }
  }

  addControllerToSet(ac: AbortController) {
    this.controllerSetOfAbortingWithRoute.add(ac)
  }

  cleanControllerSet() {
    for (const ac of this.controllerSetOfAbortingWithRoute) {
      ac.abort()
    }

    this.controllerSetOfAbortingWithRoute.clear()
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
}

export default RequestManager
