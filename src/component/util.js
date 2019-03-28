import ReactTextComponent from './ReactTextComponent'
import ReactDomComponent from './ReactDomComponent'
import ReactCompositeComponent from './ReactCompositeComponent'

// component工厂，用来返回一个component实例
export default function instantiateReactComponent(node) {
  // 文本节点的情况
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactTextComponent(node)
  }

  // 浏览器默认节点的情况
  if (typeof node === 'object' && typeof node.type === 'string') {
    return new ReactDomComponent(node)
  }

  // 自定义的元素节点
  if (typeof node === 'object' && typeof node.type === 'function') {
    return new ReactCompositeComponent(node)
  }
}

// 判断是更新还是渲染
export function shouldUpdateReactComponent(prevVDom, nextVDom) {
  if (prevVDom != null && nextVDom != null) {
    const prevType = typeof prevVDom
    const nextType = typeof nextVDom

    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number'
    } else {
      return nextType === 'object' && prevVDom.type === nextVDom.type && prevVDom.key === nextVDom.key
    }
  }
}

// 将children数组转化为map
export function arrayToMap(array) {
  array = array || []
  const childMap = {}

  array.forEach((item, index) => {
    const name = item && item._vDom && item._vDom.key ? item._vDom.key : index.toString(36)
    childMap[name] = item
  })
  return childMap
}

// 用于将childNode插入到指定位置
export function insertChildAt(parentNode, childNode, index) {
  var beforeChild = parentNode.children[index]
  beforeChild ? parentNode.insertBefore(childNode, beforeChild) : parentNode.appendChild(childNode)
}

// 删除节点
export function deleteChild(parent, child) {
  if (child) {
    if (child.remove) {
      child.remove()
    } else {
      parent.removeChild(child) // ie
    }
  }
}

class Events {
  constructor() {
    this.event = {}
    this.eventTag = 'data-reactcoreid'
    this.eventTypes = {}
    this.mounts = {} // didmount 事件
    this.delegate = this.delegate.bind(this)
    this.undelegate = this.undelegate.bind(this)
    this.bind = this.on.bind(this)
    this.trigger = this.trigger.bind(this)
    this.unbind = this.unbind.bind(this)
    this.onMount = this.onMount.bind(this)
    this.triggerMount = this.triggerMount.bind(this)
  }

  /**
   * 事件委托，统计绑定类型
   * @param query
   * @param type
   * @param callback
   */
  delegate(query, type, callback) {
    const events = this.event[query] = this.event[query] || {}
    const typeHanders = events[type] = events[type] || []
    typeHanders.push(callback)
    this.bind(query, type, callback)
    if (this.eventTypes[type]) {
      this.eventTypes[type]++
    } else {
      this.eventTypes[type] = 1
    }
  }

  /**
   * 卸载委托事件，某委托事件类型数量为0则，卸载绑定
   * @param query
   * @param type
   */
  undelegate(query, type) {
    const querys = Object.keys(this.event).filter(id => {
      return id.indexOf(query) === 0
    })
    querys.forEach((id) => {
      const events = this.event[id] || {}
      if (type) {
        delete events[type]
        if (!(--this.eventTypes[type])) {
          this.unbind(type)
        }
      } else {
        Object.keys(events).forEach(eType => {
          if (!(--this.eventTypes[eType])) {
            this.unbind(type)
          }
        })
        delete this.event[id]
      }
    })
  }

  /**
   * 事件委托触发，根据 eventTag，递归父节点冒泡触发
   * @param e
   */
  trigger(e) {
    const event = e.target || e.srcElement
    let curElement = event
    // 递归冒泡触发事件
    while (curElement) {
      const tag = curElement.getAttribute && curElement.getAttribute(this.eventTag)
      if (tag) {
        const cbs = (this.event[tag] || {})[e.type] || []
        let isCancelDubble = false
        try {
          cbs.forEach((cb) => {
            isCancelDubble = cb && cb(e)
          })
          // 若返回 true 则 取消冒泡，性能考虑最好最外层返回 true
          if (isCancelDubble) break
        } catch (e) {
          console.log(e)
          break
        }
      }
      curElement = tag && tag.length === 1 ? null : curElement.parentNode || curElement.parentElement
    }
  }

  /**
   * 按事件类型把事件委托在document上
   * @param query
   * @param type
   */
  on(query, type) {
    if (document.addEventListener) {
      document.addEventListener(type, this.trigger)
    } else {
      document.attachEvent(type, this.trigger) // IE
    }
  }

  /**
   * 事件卸载
   * @param type
   */
  unbind(type) {
    if (document.removeEventListener) {
      document.removeEventListener(type, this.trigger)
    } else {
      document.detachEvent(type, this.trigger)
    }
  }

  /**
   * 挂载didmount事件
   * @param id
   * @param mount
   */
  onMount(id, mount) {
    this.mounts[id] = mount
  }

  /**
   * 触发didmount事件
   */
  triggerMount() {
    Object.keys(this.mounts).forEach(id => {
      const cb = this.mounts[id]
      delete this.mounts[id]
      try {
        cb && cb()
      } catch (e) {
        console.log(e)
      }
    })
  }
}

export const Event = new Events()

export function replaceWith(_rootNodeId, renderMarkup) {
  const curNode = document.querySelector(`[data-reactcoreid="${_rootNodeId}"]`)
  const parentNode = curNode.parentNode || curNode.parentElement
  const container = document.createElement('div')
  container.innerHTML = renderMarkup
  parentNode.replaceChild(container.firstChild, curNode)
}
