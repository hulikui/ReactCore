## React-core.js
-   `react` 核心实现
-   update生命周期阶段 `setState` 目前属于同步更新，需配合 `setTimeout` 等异步操作使用，否则会死循环
-   其他 `setAttribute` 引起的未知兼容问题
-   旨在不使用任何第三方库的基础上，屏蔽底层DOM操作

## 关键词
-   `jsx`
-   `virtual DOM`
-   `ReactComponent`
-   挂载与更新
-   diff算法
-   事件委托

## 技术实现
## virtual dom 实现 
-   React 节点基于 `vDom` 实现
```js
/**
* vDom
* @param type 节点类型
* @param key 标识唯一的 element
* @param props 节点属性
* @constructor
*/
function VDom(type, key, props) {
  this.type = type;
  this.key = key;
  this.props = props;
}

```
-   通常使用 `jsx` 写的 `function component` 以及 `ReactComponent` 都会通过 `babel` 编译成 `vDom`
    -   而 `babel` 可以通过具体指定具体的 `React.createElement` 方法 解析成 `vDom`
    -   自定义 `React.createElement` 配置详见 `.babelrc`
-   `jsx` 是 `React.createElement` 的语法糖

```js
/**
* 创建虚拟dom
* @param type
* @param config
* @param children
* @returns {VDom}
*/
function createElement(type, config = {}, ...children) {
  const props = {};
  const {key = null} = config;
  // 复制属性
  for (let propName in config) {
    if (config.hasOwnProperty(propName) && propName !== 'key') {
      const name = propName === 'className' ? 'class'
              : (/^on[A-Za-z]/.test(propName) ? propName.toLowerCase() : propName);
            props[name] = config[propName]
    }
  }
  // 转换 children 子节点
  if (children.length === 1 && Array.isArray(children[0])) {
    props.children = children[0];
  } else {
    props.children = children;
  }
  // 过滤 子节点 存在 false null 空字符串的情况
  props.children = props.children.filter(child => child);
  return new VDom(type, key, props);
}
```

## ReactComponent 的实现
-   `vDom` 是构造 `ReactComponent` 基本属性
-   `VDom` 分为三种
    -   文本类型
    -   原生DOM
    -   自定义类型(组件产生)
-   根据不同类型，封装成不同的 `ReactComponent`
    -   超类 `ReactComponent`
    -   子类 
        -   `ReactTextComponent`
        -   `ReactDomComponent`
        -   `ReactCompositeComponent`
```js
/**
* 基类
*/
class Component {
  constructor(element) {
    this._vDom = element;
    // 标识当前component
    this._rootNodeId = null;
  }
}
```   
-   让不同类型的 组件 继承这个基类
-   每种基类都有 mount 和 update 方法
-   `mount` 渲染
-   `update` 更新
```js
class ReactTextComponent extends ReactComponent {
    // 渲染
  mountComponent() {}

  // 更新
  updateComponent() {}
}
```
```js
class ReactDomComponent extends ReactComponent {
    // 渲染
  mountComponent() {}

  // 更新
  updateComponent() {}
}
```  

```js
class ReactCompositeComponent extends ReactComponent {
    // 渲染
  mountComponent() {}

  // 更新
  updateComponent() {}
}
```
## 入口实现
```js
import Component from './Component'
import createElement from './ReactElement'
import instantiateReactComponent, {Event} from './component/util'

export default {
  nextReactRootIndex: 0, // 标识每个根节点id
  Component, // 所有自定义组件的父类
  createElement, // 创建vdom
  eventBinds: Event, // event
  render(vDom, container) { // 入口
    const componentInstance = instantiateReactComponent(vDom) // 通过vDom生成Component
    const {renderMarkup} = componentInstance.mountComponent(this.nextReactRootIndex++)
    container.innerHTML = renderMarkup
    // 触发 didmount 事件
    Event.triggerMount();
  }
}
```
-   渲染和更新封装在不同的组件内，需要一个工厂函数对应不同的 `vDom` 生成对应的 `ReactComponent`
```js
// component工厂，用来返回一个component实例
function instantiateReactComponent(node) {
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
```
-   再调用 `mountComponent` 递归获取 标签字符串，然后插入真实DOM中

## vDom 渲染
### ReactTextComponent
```js
// 用来表示文本节点在渲染，包一层dom便于标识
class ReactTextComponent extends ReactComponent {
  // 渲染
    mountComponent(rootId) {
      this._rootNodeId = rootId
      return {renderMarkup: `<span data-reactid="${rootId}">${escapeHTML(this._vDom + '')}</span>`}
    }
}
```
### ReactDomComponent
-   原生DOM
    -   元素类型
    -   属性 以及 事件的处理
    -   子节点的递归渲染

```js
export default class extends ReactComponent {
  constructor(vDom) {
    super(vDom)
    this._renderedChildComponents = null
  }

  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId

    const { props, type, props: { children = [] } } = this._vDom,
      childComponents = []

    // 设置tag，加上标识
    let tagOpen = `${type} data-reactid=${this._rootNodeId}`,
      tagClose = `/${type}`,
      content = ''

    // 拼凑属性
    for (let propKey in props) {
      // 事件处理
      if (/^on[A-Za-z]/.test(propKey)) {
        const eventType = propKey.replace('on', '')
        Event.delegate(this._rootNodeId, eventType, props[propKey]);
      }

      // 普通属性，排除children与事件
      if (props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)) {
        if (propKey === 'style') {
          const str = Object.keys(props[propKey]).reduce((pre, cur) => `${pre}${cur}:${props[propKey][cur]};`, '');
          tagOpen += ` ${propKey}="${str}"`
        } else {
          tagOpen += ` ${propKey}="${props[propKey]}"`
        }
      }
    }
    if (type === 'textarea') {
      content = props.value
    }
    // 获取子节点渲染出的内容
    children.forEach((item, index) => {
      // 再次使用工厂方法实例化子节点的component，拼接好返回
      const childComponent = instantiateReactComponent(item)
      childComponent._mountIndex = index

      childComponents.push(childComponent)

      // 子节点的rootId是父节点的rootId加上索引拼接的值
      const curRootId = `${this._rootNodeId}.${index}`
      // 得到子节点的渲染内容
      const {renderMarkup} = childComponent.mountComponent(curRootId)
      // 拼接
      content += renderMarkup

      // 保存所有子节点的component
      this._renderedChildComponents = childComponents
    })

    return {renderMarkup: `<${tagOpen}>${content}<${tagClose}>`}
  }
}
```
-   事件系统 `Event` 主要使用事件委托，篇后介绍
  
### ReactCompositComponent
-   创建自定义组件通常会继承 `React.Component`
```js
class App extends React.Component {
  render() {
    return (<div></div>
  }
}
```
-   实现 `React.Component` 父类
```js
// 所有自定义组件的父类
export default class {
  constructor(props) {
    this.props = props;
  }
  get _name_() {
    return 'component'
  }
  setState(newState) {
    this._reactInternalInstance.updateComponent(null, newState)
  }
}

```
-   主要实现 `setState`
-   自定义的 `vDOM` 的 `type` 是我们创建 `Component` 的引用    
-   首先 根据 `vDOM` 的 `type` 创建 上述三种实例组件
-   调用 初始渲染的生命周期 和 `render` 方法
-   render返回组件内容的 `vDOM`，根据 `vDOM` 创建 `ReactComponent` 并调用 `mount`

```js
export default class extends ReactComponent {
  constructor(element) {
    super(element)
    // 存放对应的组件实例
    this._instance = null
    this._renderedComponent = null
  }

  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId
    const { type: Component, props } = this._vDom

    // 获取自定义组件的实例
    const inst = new Component(props)
    this._instance = inst

    // 保留对当前component的引用，下面更新时会用到
    inst._reactInternalInstance = this

    inst.componentWillMount && inst.componentWillMount()

    // 调用自定义组件的render方法，返回一个Vdom
    const renderedVdom = inst.render()

    // 获取renderedComponent的component
    const renderedComponent = instantiateReactComponent(renderedVdom)
    this._renderedComponent = renderedComponent

    // 得到渲染之后的内容
    const {renderMarkup} = renderedComponent.mountComponent(this._rootNodeId)

    // 在React.render方法最后触发了mountReady事件，所在在这里监听，在渲染完成后触发
    if (inst.componentDidMount) {
      Event.onMount(this._rootNodeId, inst.componentDidMount.bind(inst));
    }
    return {renderMarkup}
  }
}
```
## ReactComponent 更新
-   如何触发更新 `setState`
```js
// 所有自定义组件的父类
class Component {
  constructor(props) {
    this.props = props
  }

  setState(newState) {
    this._reactInternalInstance.updateComponent(null, newState)
  }
}
```
-   `_reactInternalInstance` 是在渲染 `ReactCompositeComponent` 保存下来的实例
-   实例再调用 `updateComponent`
### ReactCompositeComponent
-   调用 更新 生命周期
```js
export default class extends ReactComponent {
  constructor(element) {
    super(element)
    // 存放对应的组件实例
    this._instance = null
    this._renderedComponent = null
  }
// 更新
  updateComponent(nextVDom, newState) {
    // 如果有新的vDom,就使用新的
    this._vDom = nextVDom || this._vDom
    const inst = this._instance
    // 获取新的state,props
    const nextState = { ...inst.state, ...newState }
    const nextProps = this._vDom.props
    if (inst.props !== nextProps) {
      inst.componentWillReceiveProps && inst.componentWillReceiveProps(nextProps)
    }
    // 判断shouldComponentUpdate
    if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return
    inst.componentWillUpdate && inst.componentWillUpdate(nextProps, nextState)

    // 更改state,props
    inst.state = nextState
    inst.props = nextProps

    const prevComponent = this._renderedComponent

    // 获取render新旧的vDom
    const prevRenderVDom = prevComponent._vDom
    const nextRenderVDom = inst.render()

    // 判断是需要更新还是重新渲染
    if (shouldUpdateReactComponent(prevRenderVDom, nextRenderVDom)) {
      // 更新
      prevComponent.updateComponent(nextRenderVDom)
      inst.componentDidUpdate && inst.componentDidUpdate()
    } else {
      // 重新渲染
      this._renderedComponent = instantiateReactComponent(nextRenderVDom)
      // 重新生成对应的元素内容
      const {renderMarkup} = this._renderedComponent.mountComponent(this._rootNodeId)
      // 替换整个节点
      replaceWith(this._rootNodeId, renderMarkup)
    }
  }
}
```
-   `shouldComponentUpdate` 判断是否更新，基于浅比较
-   调用render 获取新的 `vDOM`，将会比较 新旧 `vDom` 是否相同，这就需要用到 `diff` 算法
    -   类型相同则更新
    -   否则重新渲染替换
```js
// 判断是更新还是渲染
function shouldUpdateReactComponent(prevVDom, nextVDom) {
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
```   
-   添加 key 迅速判断两个vDom是否相同
### ReactTextComponent
-   直接替换内容
```js
export default class extends ReactComponent {
  // 更新
  updateComponent(nextVDom) {
    const nextText = '' + nextVDom

    if (nextText !== this._vDom) {
      this._vDom = nextText
    }
    // 替换整个节点
    const dom = document.querySelector(`[data-reactid="${this._rootNodeId}"]`);
    if (dom) dom.innerHTML = escapeHTML(this._vDom)
  }
}
```
### ReactDomComponent
-   `diff` 算法
-   `props` 更新 和 `children` 更新
```js
export default class extends ReactComponent {
  constructor(vDom) {
    super(vDom)
    this._renderedChildComponents = null
  }
 // 更新
  updateComponent(nextVDom) {
    const lastProps = this._vDom.props
    const nextProps = nextVDom.props

    this._vDom = nextVDom

    // 更新属性
    this._updateDOMProperties(lastProps, nextProps)
    // 再更新子节点
    this._updateDOMChildren(nextVDom.props.children)
  }  
}
```
-   更新 `props` 需要注意部分属性的兼容性
-   删除不在新`props`里的旧`props`
-   添加不在老`props`里的新`props`
-   事件处理 删除 后 再添加
```js
 function _updateDOMProperties(lastProps, nextProps) {
    let propKey = ''

    // 遍历，删除已不在新属性集合里的老属性
    for (propKey in lastProps) {
      // 属性在原型上或者新属性里有，直接跳过
      // 对于事件等特殊属性，需要单独处理
      if (/^on[A-Za-z]/.test(propKey)) {
        const eventType = propKey.replace('on', '')
        // 针对当前的节点取消事件代理
        Event.undelegate(this._rootNodeId, eventType);
        continue
      }
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
        continue
      }
      // 删除不在新属性里的旧属性
      if (!nextProps.hasOwnProperty(propKey)) {
        document.querySelector(`[data-reactid="${this._rootNodeId}"]`).removeAttribute(propKey)
      }
    }

    // 对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
      // 更新事件属性
      if (/^on[A-Za-z]/.test(propKey)) {
        var eventType = propKey.replace('on', '')

        // 以前如果已经有，需要先去掉
        lastProps[propKey] && Event.undelegate(this._rootNodeId, eventType);

        // 针对当前的节点添加事件代理
        Event.delegate(this._rootNodeId, eventType, nextProps[propKey]);
        continue
      }

      if (propKey === 'children') continue

      // 更新普通属性
      let value = nextProps[propKey];
      // style 对象转字符串
      if (propKey === 'style') {
        value = Object.keys(value).reduce((pre, cur) => `${pre}${cur}:${value[cur]};`, '');
      }
      const dom = document.querySelector(`[data-reactid="${this._rootNodeId}"]`);
      if (dom) {
        // input 设置 value 时特殊处理
        if (dom.tagName.toLowerCase() === 'input' && propKey === 'value') {
          dom[propKey] = value;
        } else {
          dom.setAttribute(propKey, value);
        }
      }
    }
  }
```
-   `children` 更新涉及 `diff`算法
    -   `tree diff`
        -   同一层级 `diff`
    -   `component diff`
        -   `shouldUpdateReactComponent`
    -   `element diff`
        -   map Array - key
```js
// 全局的更新深度标识，用来判定触发patch的时机
let updateDepth = 0
// 全局的更新队列
let diffQueue = []
function _updateDOMChildren(nextChildVDoms) {
    updateDepth++

    // diff用来递归查找差异，组装差异对象，并添加到diffQueue中
    this._diff(diffQueue, nextChildVDoms)
    updateDepth--

    if (updateDepth === 0) {
      // 具体的dom渲染
      this._patch(diffQueue)
      diffQueue = []
    }
  }  
```
-   `updateDepth` 对 `vDom` 树进行层级控制，只会对相同层级的DOM节点进行比较
-   当DOM树遍历完，才调用`patch`处理差异 `tree diff`     
    
### 部分diff 方法
```js
// 将之前子节点的component数组转化为map
const prevChildComponents = arrayToMap(this._renderedChildComponents)
// 生成新的子节点的component对象集合
const nextChildComponents = generateComponentsMap(prevChildComponents, nextChildVDoms)
```
-   `arrayToMap` 把子节点数组以key转化为对象map
-   用老的`ReactComponents`集合和新`vDoms`数组生成新的`ReactComponents`集合
```js
/**
 * 用来生成子节点的component
 * 如果是更新，就会继续使用以前的component，调用对应的updateComponent
 * 如果是新的节点，就会重新生成一个新的componentInstance
 */
function generateComponentsMap(prevChildComponents, nextChildVDoms = []) {
  const nextChildComponents = {}

  nextChildVDoms.forEach((item, index) => {
    const name = item.key ? item.key : index.toString(36)
    const prevChildComponent = prevChildComponents && prevChildComponents[name]

    const prevVdom = prevChildComponent && prevChildComponent._vDom
    const nextVdom = item

    // 判断是更新还是重新渲染
    if (shouldUpdateReactComponent(prevVdom, nextVdom)) {
      // 更新的话直接递归调用子节点的updateComponent
      prevChildComponent.updateComponent(nextVdom)
      nextChildComponents[name] = prevChildComponent
    } else {
      // 重新渲染的话重新生成component
      const nextChildComponent = instantiateReactComponent(nextVdom)
      nextChildComponents[name] = nextChildComponent
    }
  })
  return nextChildComponents
}
```
-   获得新旧的同一层级 `ReactComponents` 集合，遍历进行比较，移动，新增和删除
### element diff
-   首先位移操作：`相同节点`
    -   新节点位置比旧节点位置靠前，不移动
    -   新节点位置比纠结点位置靠后，旧节点移动到新节点的位置
-   位移结束后
    -   遍历新增或者待删除节点
        
```js
// 差异更新的几种类型
const UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}
function _diff(diffQueue, nextChildVDoms) { // 追踪差异
    // 将之前子节点的component数组转化为map
    const prevChildComponents = arrayToMap(this._renderedChildComponents)
    // 生成新的子节点的component对象集合
    const nextChildComponents = generateComponentsMap(prevChildComponents, nextChildVDoms)

    // 重新复制_renderChildComponents
    this._renderedChildComponents = []
    for (let name in nextChildComponents) {
      nextChildComponents.hasOwnProperty(name) && this._renderedChildComponents.push(nextChildComponents[name])
    }

    let lastIndex = 0 // 代表访问的最后一次老的集合位置
    let nextIndex = 0 // 代表到达的新的节点的index

    // 通过对比两个集合的差异，将差异节点添加到队列中
    for (let name in nextChildComponents) {
      if (!nextChildComponents.hasOwnProperty(name)) continue

      const prevChildComponent = prevChildComponents && prevChildComponents[name]
      const nextChildComponent = nextChildComponents[name]

      // 相同的话，说明是使用的同一个component，需要移动
      if (prevChildComponent === nextChildComponent) {
        // 添加差异对象，类型：MOVE_EXISTING
        prevChildComponent._mountIndex < lastIndex && diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: document.querySelector(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChildComponent._mountIndex,
          id: prevChildComponent._rootNodeId,
          toIndex: nextIndex
        })

        lastIndex = Math.max(prevChildComponent._mountIndex, lastIndex)
      } else {
        // 如果不相同，说明是新增的节点
        // 如果老的component在，需要把老的component删除
        if (prevChildComponent) {
          diffQueue.push({
            parentId: this._rootNodeId,
            parentNode: document.querySelector(`[data-reactid="${this._rootNodeId}"]`),
            type: UPDATE_TYPES.REMOVE_NODE,
            fromIndex: prevChildComponent._mountIndex,
            id: prevChildComponent._rootNodeId,
            toIndex: null
          })

          // 去掉事件监听
          if (prevChildComponent._rootNodeId) {
            // debugger
            Event.undelegate(prevChildComponent._rootNodeId);
          }

          lastIndex = Math.max(prevChildComponent._mountIndex, lastIndex)
        }

        // 新增加的节点
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: document.querySelector(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndex,
          markup: nextChildComponent.mountComponent(`${this._rootNodeId}.${name}`).renderMarkup
        })
      }

      // 更新_mountIndex
      nextChildComponent._mountIndex = nextIndex
      nextIndex++
    }

    // 对于老的节点里有，新的节点里没有的，全部删除
    for (let name in prevChildComponents) {
      const prevChildComponent = prevChildComponents[name]

      if (prevChildComponents.hasOwnProperty(name) &&
        !(nextChildComponents && nextChildComponents.hasOwnProperty(name))) {
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: document.querySelector(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.REMOVE_NODE,
          id: prevChildComponent._rootNodeId,
          fromIndex: prevChildComponent._mountIndex,
          toIndex: null
        })

        // 如果渲染过，去掉事件监听，包括子节点的所有事件
        if (prevChildComponent._rootNodeId) {
          Event.undelegate(prevChildComponent._rootNodeId);
        }
      }
    }
  }
  
```
-   一棵树遍历完后，就需要通过`patch`将更新的内容渲染出来
-   操作`diffQueue`
```js
  function _patch(updates) {
    updates.forEach(({ type, fromIndex, toIndex, parentNode, parentId, markup, id }) => {
      const updatedChild = parentNode.children[fromIndex];
      switch (type) {
        case UPDATE_TYPES.INSERT_MARKUP:
          const container = document.createElement('div');
          container.innerHTML = markup;
          insertChildAt(parentNode, container.firstChild, toIndex) // 插入
          break
        case UPDATE_TYPES.MOVE_EXISTING:
          deleteChild(parentNode, document.querySelector(`[data-reactid="${id}"]`));
          insertChildAt(parentNode, updatedChild, toIndex)
          break
        case UPDATE_TYPES.REMOVE_NODE:
          deleteChild(parentNode, document.querySelector(`[data-reactid="${id}"]`));
          break
        default:
          break
      }
    })
  }
```
-   其他原生操作
```js
// 用于将childNode插入到指定位置
export function insertChildAt(parentNode, childNode, index) {
  var beforeChild = parentNode.children[index]
  beforeChild ? parentNode.insertBefore(childNode, beforeChild) : parentNode.appendChild(childNode);
}

// 删除节点
export function deleteChild(parent, child) {
  if (child) {
    if (child.remove) {
      child.remove();
    } else {
      parent.removeChild(child); // ie
    }
  }
}
```
### 总结
> - `ReactCompositeComponent`：负责调用生命周期，通过`component diff`将更新都交给了子`ReactComponent`
>  - `ReactTextComponent`：直接更新内容
>  - `ReactDomComponent`：
    -   先更新`props`，在更新`children`
    -   更新`children`分为三步
        -   `tree diff`保证同层级比较
        -   使用`shouldUpdateReactComponent`进行`component diff`
        -   最后在`element diff`通过`lastIndex`顺序优化
## 事件处理
-   事件代理，某一类事件绑定至 `document`
-   引用计数，卸载某一类事件监听
-   事件源触发某一事件时，冒泡递归调用至最外层节点
-   以`vDom`节点的`key`为索引
```js
class Events {
  constructor() {
    this.event = {};
    this.eventTag = 'data-reactid';
    this.eventTypes = {};
    this.mounts = {}; // didmount 事件
    this.delegate = this.delegate.bind(this);
    this.undelegate = this.undelegate.bind(this);
    this.bind = this.on.bind(this);
    this.trigger = this.trigger.bind(this);
    this.unbind = this.unbind.bind(this);
    this.onMount = this.onMount.bind(this);
    this.triggerMount = this.triggerMount.bind(this);
  }

  /**
   * 事件委托，统计绑定类型
   * @param query
   * @param type
   * @param callback
   */
  delegate(query, type, callback) {
    const events = this.event[query] = this.event[query] || {};
    const typeHanders = events[type] = events[type] || [];
    typeHanders.push(callback);
    this.bind(query, type, callback);
    if (this.eventTypes[type]) {
      this.eventTypes[type]++;
    } else {
      this.eventTypes[type] = 1;
    }
  }

  /**
   * 卸载委托事件，某委托事件类型数量为0则，卸载绑定
   * @param query
   * @param type
   */
  undelegate(query, type) {
    const querys = Object.keys(this.event).filter(id => {
      return id.indexOf(query) === 0;
    });
    querys.forEach((id) => {
      const events = this.event[id] || {};
      if (type) {
        delete events[type];
        if (!(--this.eventTypes[type])) {
          this.unbind(type)
        }
      } else {
        Object.keys(events).forEach(eType => {
          if (!(--this.eventTypes[eType])) {
            this.unbind(type)
          }
        });
        delete this.event[id];
      }
    });
  }

  /**
   * 事件委托触发，根据 eventTag，递归父节点冒泡触发
   * @param e
   */
  trigger(e) {
    const event = e.target || e.srcElement;
    let curElement = event;
    // 递归冒泡触发事件
    while (curElement) {
      const tag = curElement.getAttribute && curElement.getAttribute(this.eventTag);
      if (tag) {
        const cbs = (this.event[tag] || {})[e.type] || [];
        let isCancelDubble = false
        try {
          cbs.forEach((cb) => {
            isCancelDubble = cb && cb(e);
          });
          // 若返回 true 则 取消冒泡，性能考虑最好最外层返回 true
          if (isCancelDubble) break;
        } catch (e) {
          console.log(e);
          break;
        }
      }
      curElement = tag && tag.length === 1 ? null : curElement.parentNode || curElement.parentElement;
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
      document.attachEvent(type, this.trigger); // IE
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
    this.mounts[id] = mount;
  }

  /**
   * 触发didmount事件
   */
  triggerMount() {
    Object.keys(this.mounts).forEach(id => {
      const cb = this.mounts[id];
      delete this.mounts[id];
      try {
        cb && cb();
      } catch (e) {
        console.log(e)
      }
    });
  }
}

``` 

## 参考资料
[从头实现一个简易版React](!https://segmentfault.com/a/1190000013510464)               
