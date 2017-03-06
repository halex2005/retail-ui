// @flow

import React from 'react';

import HintBox from './HintBox';

type Props = {
  children: any,
  pos: 'top' | 'right' | 'bottom' | 'left',
  text: string,
  use: 'hover' | 'manual',
};

export default class Hint extends React.Component {
  static defaultProps = {
    pos: 'top',
    use: 'hover',
  };

  props: Props;

  constructor(props) {
    super(props);

    this.state = {
      opened: props.use === 'manual' ? props.opened : false,
    }
  }

  _timer: number = 0;
  _dom: ?HTMLElement;

  componentWillReceiveProps(nextProps) {
    if (nextProps.use === 'manual' && this.props.opened !== nextProps.opened) {
      this.setState({opened: nextProps.opened});
    }
  }

  render() {
    return (
      <span
        ref={this._ref}
        onMouseEnter={this._handleMouseEnter}
        onMouseLeave={this._handleMouseLeave}
      >
        {this.props.children}
        {this.state.opened && (
          <HintBox
            getTarget={this._getDOM}
            text={this.props.text}
            pos={this.props.pos}
          />
        )}
      </span>
    );
  }

  _ref = (el: ?HTMLElement) => {
    this._dom = el;
  };

  _getDOM = () => {
    return this._dom;
  };

  _handleMouseEnter = () => {
    if (this.props.use === 'hover') {
      this._timer = setTimeout(this._open, 400);
    }
  };

  _handleMouseLeave = () => {
    if (this.props.use === 'hover') {
      clearTimeout(this._timer);
      this.setState({opened: false});
    }
  };

  _open = () => {
    this.setState({ opened: true });
  };
}
