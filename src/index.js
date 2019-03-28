import Component from './Component'
import createElement from './ReactElement'
import instantiateReactComponent, {Event} from './component/util'

const React = {
  nextReactRootIndex: 0, // 标识id
  Component, // 所有自定义组件的父类
  createElement, // 创建vdom
  eventBinds: Event, // event
  render(vDom, container) { // 入口
    const componentInstance = instantiateReactComponent(vDom)
    const {renderMarkup} = componentInstance.mountComponent(this.nextReactRootIndex++)
    container.innerHTML = renderMarkup
    Event.triggerMount()
  }
}

window.ReactCore = React;

export default React;

