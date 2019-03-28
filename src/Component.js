// 所有自定义组件的父类
export default class {
  constructor(props) {
    this.props = props
  }
  get _name_() {
    return 'component'
  }
  setState(newState) {
    this._reactInternalInstance.updateComponent(null, newState)
  }
}
