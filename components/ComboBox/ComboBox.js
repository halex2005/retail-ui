/* @flow */

import classNames from 'classnames';
import React, {PropTypes} from 'react';
import ReactDOM from 'react-dom';

import filterProps from '../filterProps';

import Input from '../Input';
import ScrollContainer from '../ScrollContainer';

import styles from './ComboBox.less';

const INPUT_PASS_PROPS = {
  width: true,
};

type Value = any;
type Info = any;

type SourceResult = {
  values: Array<Value>,
  infos?: Array<Info>,
  total?: number,
};

type RecoverResult = {
  value: Value,
  info?: Info,
};

type RecoverFunc = (searchString: string) => RecoverResult;

type Props = {
  value: ?Value,
  info?: Info | (v: Value) => Promise<Info>,
  source: (searchText: string) => Promise<SourceResult>,
  disabled?: bool,
  openButton?: bool,
  placeholder?: string,
  renderValue: (value: Value, info: ?Info) => ReactElement,
  renderItem: (value: Value, info: Info) => ReactElement,
  recover?: (RecoverFunc | bool),
  width: (number | string),
  onChange: (event: {target: {value: Value}}, value: Value) => void,
};

type State = {
  opened: bool,
  searchText: string,
  value: Value,
  info: Info,
  result: ?SourceResult,
  selected: number,
};

/**
 * DRAFT
 */
class ComboBox extends React.Component {
  static propTypes = {
    value: PropTypes.any,

    /**
     * Данные, которые будут переданы в функции для отрисовки значений
     * (`renderValue` и `renderItem`).
     */
    info: PropTypes.oneOfType([
      PropTypes.any,
      PropTypes.func,
    ]),

    source: PropTypes.func.isRequired,

    disabled: PropTypes.bool,

    /**
     * Показывать кнопку-треугольник для показа резаультатов.
     */
    openButton: PropTypes.bool,

    placeholder: PropTypes.string,

    renderValue: PropTypes.func,

    renderItem: PropTypes.func,

    /**
     * Функция для обработки неожиданного ввода. Если пользователь ввел что-то в
     * строку поиска и нажал Enter или ушел из поля, не выбрав значение, то
     * будет вызвана эта функция, которая может вернуть значение, которое будет
     * использовано как будто оно было выбрано.
     *
     * Возвращаемое значение может быть `null`, либо объектом такой формы:
     * `{value: any, info?: any}`.
     *
     * Если задать это поле в `true`, то будет использована такая функция:
     * `(searchText) => searchText`.
     */
    recover: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.func,
    ]),

    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    onChange: PropTypes.func,
  };

  static defaultProps = {
    renderItem,
    renderValue,
    placeholder: 'Пусто',
    width: 250,
  };

  props: Props;
  state: State;

  _focusable: ?HTMLElement;
  _scroll: ?ScrollContainer;
  _itemNodes: {[_: number]: HTMLElement};
  _recoverResult: ?RecoverResult;

  constructor(props: Props, context: any) {
    super(props, context);

    this.state = {
      opened: false,
      searchText: '',
      value: props.value !== undefined ? props.value : null,
      info: null,
      result: null,
      selected: -1,
    };
    this._focusable = null;
    this._scroll = null;
    this._itemNodes = {};
    this._recoverResult = null;
  }

  render() {
    let valueEl;
    if (this.state.opened) {
      valueEl = this.renderOpenedValue();
    } else {
      valueEl = this.renderClosedValue();
    }
    return (
      <label className={styles.root} style={{width: this.props.width}}>
        {valueEl}
        {this.state.opened && this.renderMenu()}
        {this.props.openButton && <div className={styles.arrow} />}
      </label>
    );
  }

  renderOpenedValue() {
    const inputProps = filterProps(this.props, INPUT_PASS_PROPS);
    return (
      <div className={styles.input}>
        <Input ref={this._refFocusable} {...inputProps}
          value={this.state.searchText} rightIcon={<span />}
          disabled={this.props.disabled} onChange={this._handleInputChange}
          onKeyDown={this._handleInputKey} onBlur={this._handleInputBlur}
        />
      </div>
    );
  }

  renderClosedValue() {
    let value;
    if (this.state.value == null) {
      value = (
        <span className={styles.placeholder}>{this.props.placeholder}</span>
      );
    } else if (this.props.info) {
      if (this.state.info) {
        value = this.props.renderValue(this.state.value, this.state.info);
      } else {
        value = <i>Загрузка</i>;
      }
    } else {
      value = this.props.renderValue(this.state.value, null);
    }

    return (
      <div ref={this._refFocusable} className={styles.value} tabIndex="0"
        onClick={this._handleValueClick} onKeyDown={this._handleValueKey}
        onKeyPress={this._handleValueKeyPress}
      >
        {value}
      </div>
    );
  }

  renderMenu() {
    const {result} = this.state;
    if (!result) {
      return null;
    }
    return (
      <div className={styles.menuHolder}>
        <div className={styles.menu}>
          <ScrollContainer ref={this._refScroll} maxHeight={200}>
            {mapResult(result, (value, info, i) => {
              const className = classNames({
                [styles.menuItem]: true,
                [styles.menuItemSelected]: this.state.selected === i,
              });
              return (
                <div key={i} ref={(el) => this._refItem(el, i)}
                  className={className}
                  onMouseDown={(e) => this._handleItemClick(e, value)}
                  onMouseEnter={(e) => this.setState({selected: i})}
                  onMouseLeave={(e) => this.setState({selected: -1})}
                >
                  {this.props.renderItem(value, info)}
                </div>
              );
            })}
          </ScrollContainer>
        </div>
      </div>
    );
  }

  componentWillMount() {
    if (this.state.value != null) {
      this._loadItem(this.state.value);
    }
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.value !== undefined) {
      this.setState({value: newProps.value});
      this._resetItem(newProps.value);
    }
  }

  // $FlowIssue 850
  _refFocusable = (el: ?HTMLElement) => {
    this._focusable = el && (el.focus ? el : ReactDOM.findDOMNode(el));
  };

  // $FlowIssue 850
  _refScroll = (el: ?ScrollContainer) => {
    this._scroll = el;
  };

  _refItem(el: ?HTMLElement, index: number) {
    if (el) {
      this._itemNodes[index] = el;
    } else {
      delete this._itemNodes[index];
    }
  }

  // $FlowIssue 850
  _handleInputChange = (event: any) => {
    const pattern = event.target.value;
    this.setState({
      opened: true,
      searchText: pattern,
    });
    this._fetchList(pattern);
  };

  // $FlowIssue 850
  _handleInputKey = (event) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this._moveSelection(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._moveSelection(1);
        break;
      case 'Enter':
        event.preventDefault();
        this._close(() => {
          this._focus();
        });

        const value = this.state.result &&
          this.state.result.values[this.state.selected];
        if (value) {
          this._change(value);
        } else {
          this._tryRecover();
        }
        break;
      case 'Escape':
        this._close(() => {
          this._focus();
        });
        break;
    }
  };

  // $FlowIssue 850
  _handleInputBlur = () => {
    const {result, searchText} = this.state;
    const value = result && result.values.find((v) => v === searchText);
    this.setState({opened: false});
    if (value) {
      this._change(value);
    } else {
      this._tryRecover();
    }
  };

  // $FlowIssue 850
  _handleOpenClick = () => {
    this.setState({opened: true});
    this._focus();
  };

  // $FlowIssue 850
  _handleValueClick = () => {
    this.setState({
      opened: true,
      searchText: '',
      result: null,
    });
    this._focusAsync();
    this._fetchList('');
  };

  // $FlowIssue 850
  _handleValueKeyPress = (event) => {
    // Set input value to empty string and then back to the real value to make
    // cursor appear at the and.
    const str = String.fromCharCode(event.charCode);
    this.setState(
      {
        opened: true,
        searchText: '',
      },
      this._focus
    );
  };

  // $FlowIssue 850
  _handleValueKey = (event) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        this.setState({
          opened: true,
          searchText: '',
        }, () => {
          this._focus();
        });
        this._fetchList('');
        break;
    }
  };

  _handleItemClick(event: MouseEvent, value: Value) {
    if (event.button !== 0) {
      return;
    }

    this._close();
    this._change(value);
    this._focusAsync();
  }

  _resetItem(value: Value) {
    if (this.state.value === value) {
      return;
    }

    let info;
    if (this._recoverResult && this._recoverResult.value === value) {
      info = this._recoverResult.info;
    } else {
      info = this._findInfoByValue(value);
    }
    this.setState({info});
    if (!info && typeof this.props.info) {
      this._loadItem(value);
    }
  }

  _loadItem(value: any) {
    if (typeof this.props.info === 'function') {
      this.props.info(value).then((info) => {
        if (value === this.state.value) {
          this.setState({info});
        }
      });
    }
  }

  _fetchList(pattern: string) {
    this.props.source(pattern).then((result) => {
      if (this.state.searchText === pattern) {
        this.setState({
          selected: -1,
          result,
        });
      }
    });
  }

  // $FlowIssue 850
  _focus = () => {
    if (this._focusable) {
      this._focusable.focus();
    }
  };

  _focusAsync() {
    process.nextTick(this._focus);
  }

  _moveSelection(step: number) {
    if (!this.state.result) {
      return;
    }

    let selected = this.state.selected + step;
    if (selected < 0) {
      selected = this.state.result.values.length - 1;
    }
    if (selected >= this.state.result.values.length) {
      selected = 0;
    }
    this.setState({selected}, this._scrollToSelected);
  }

  // $FlowIssue 850
  _scrollToSelected = () => {
    if (this._scroll) {
      this._scroll.scrollTo(this._itemNodes[this.state.selected]);
    }
  };

  _tryRecover() {
    const searchText = this.state.searchText;
    let recovered: ?RecoverResult = null;
    if (typeof this.props.recover === 'function') {
      recovered = this.props.recover(searchText);
    } else if (this.props.recover === true) {
      recovered = {value: searchText};
    }

    this._recoverResult = recovered;
    if (recovered) {
      this._change(recovered.value);
    }
  }

  _change(value: Value) {
    if (this.props.value === undefined) {
      this.setState({value});
      this._resetItem(value);
    }
    if (this.props.onChange) {
      this.props.onChange({target: {value}}, value);
    }
  }

  _close(callback: any) {
    this.setState({
      opened: false,
      result: null,
    }, callback);
  }

  _findInfoByValue(value: Value): ?Info {
    const {result} = this.state;
    if (result) {
      const index = result.values.findIndex((v) => v === value);
      return result.infos && result.infos[index];
    }

    return null;
  }
}

function mapResult(
  result: SourceResult,
  fn: (v: Value, d: Info, i: number) => any
): Array<any> {
  return result.values.map((value, i) => {
    const info = result.infos && result.infos[i];
    return fn(value, info, i);
  });
}

function renderValue(value, info) {
  return info;
}

function renderItem(value, info) {
  return info;
}

export default ComboBox;