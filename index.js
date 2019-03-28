/**
 * todolist
 * @author hulikui
 * @date 2019-03-27
 */

import React from './src/index'

class TodoList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      list: [],
      value: ''
    }
  }

  onAdd = () => {
    const {value, list} = this.state;
    console.log(this.state)
    if (value) {
      this.setState({
        list: list.concat(value),
        value: ""
      });
    }
  }
  onDelete = (index) => {
    const list = this.state.list;
    list.splice(index, 1);
    this.setState({
      list
    });
  }
  onChange = (e) => {
    console.log(e.target.value.trim())
    this.setState({
      value: e.target.value.trim()
    })
  }
  render() {
    return (
      <div className="todo-list">
        <ol className="list-content">
          {
            this.state.list.map((item, index) =>
              <li>{item}<button onClick={() => this.onDelete(index)}>-</button></li>
            )
          }
        </ol>
        <div className="input-add">
          <input onKeyUp={this.onChange} value={this.state.value || ""}/>
          <button onClick={this.onAdd}>+</button>
        </div>
      </div>
    );
  }
}

React.render(<TodoList/>, document.getElementById('app'));
