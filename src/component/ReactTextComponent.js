import ReactComponent from './ReactComponent'

function escapeHTML(text = '') {
  return text.replace(/<script>/g, '&lt;script&gt;').replace(/<\/script>/g, '&lt;/script&gt;')
}

// 用来表示文本节点在渲染，更新，删除时应该做的事情
export default class extends ReactComponent {
  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId
    return {renderMarkup: `<span data-reactcoreid="${rootId}">${escapeHTML(this._vDom + '')}</span>`}
  }

  // 更新
  updateComponent(nextVDom) {
    const nextText = '' + nextVDom

    if (nextText !== this._vDom) {
      this._vDom = nextText
    }
    // 替换整个节点
    const dom = document.querySelector(`[data-reactcoreid="${this._rootNodeId}"]`)
    if (dom) dom.innerHTML = escapeHTML(this._vDom)
  }
}
