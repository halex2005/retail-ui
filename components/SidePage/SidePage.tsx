import * as events from 'add-event-listener';
import classNames from 'classnames';
import { EventSubscription } from 'fbemitter';
import * as React from 'react';
import { CSSTransitionGroupTransitionName } from 'react';
import LayoutEvents from '../../lib/LayoutEvents';
import stopPropagation from '../../lib/events/stopPropagation';
import HideBodyVerticalScroll from '../HideBodyVerticalScroll';
import ModalStack from '../ModalStack';
import RenderContainer from '../RenderContainer';
import RenderLayer from '../RenderLayer';
import ZIndex from '../ZIndex';
import SidePageBody from './SidePageBody';
import SidePageContainer from './SidePageContainer';
import { SidePageContext } from './SidePageContext';
import SidePageFooter from './SidePageFooter';
import SidePageHeader from './SidePageHeader';
import Transition from 'react-addons-css-transition-group';

import styles from './SidePage.less';

export interface SidePageProps {
  /**
   * Добавить блокирующий фон, когда сайдпейдж открыт
   */
  blockBackground?: boolean;

  /**
   * Отключает событие onClose, также дизейблит кнопку закрытия сайдпейджа
   */
  disableClose?: boolean;

  /**
   * Не закрывать сайдпейдж при клике на фон.
   */
  ignoreBackgroundClick?: boolean;

  /**
   * Задать ширину сайдпейджа
   */
  width?: number;

  /**
   * Вызывается, когда пользователь запросил закрытие сайдпейджа (нажал на фон, на
   * Escape или на крестик).
   */
  onClose?: () => void;

  /**
   * Показывать сайдпэйдж слева
   *
   */
  fromLeft?: boolean;

  /**
   * Отключить анимации
   *
   */
  disableAnimations?: boolean;
}

export interface SidePageState {
  stackPosition?: number;
  hasMargin?: boolean;
  hasShadow?: boolean;
  hasBackground?: boolean;
}

const TRANSITION_TIMEOUT = 200;

interface ZIndexPropsType {
  delta: number;
  classes?: string;
  style?: React.CSSProperties;
}

/**
 * Сайдпейдж
 *
 * Содержит в себе три компоненты: **SidePage.Header**,
 * **SidePage.Body** и **SidePage.Footer**
 *
 * Для отображения серой плашки в футере в компонент
 * **Footer** необходимо передать пропс **panel**
 */
class SidePage extends React.Component<SidePageProps, SidePageState> {
  public static Header = SidePageHeader;
  public static Body = SidePageBody;
  public static Footer = SidePageFooter;
  public static Container = SidePageContainer;
  private stackSubscription: EventSubscription | null = null;
  private layoutRef: HTMLElement | null = null;

  constructor(props: SidePageProps) {
    super(props);
    this.state = {};
  }

  public componentDidMount() {
    events.addEventListener(window, 'keydown', this.handleKeyDown);
    this.stackSubscription = ModalStack.add(this, this.handleStackChange);
  }

  public componentWillUnmount() {
    events.removeEventListener(window, 'keydown', this.handleKeyDown);
    if (this.stackSubscription != null) {
      this.stackSubscription.remove();
    }
    ModalStack.remove(this);
  }

  public render() {
    const { disableAnimations } = this.props;

    return (
      <RenderContainer>
        {this.renderShadow()}
        <Transition
          transitionName={this.getTransitionNames()}
          transitionAppear={!disableAnimations}
          transitionEnter={!disableAnimations}
          transitionLeave={!disableAnimations}
          transitionAppearTimeout={TRANSITION_TIMEOUT}
          transitionEnterTimeout={TRANSITION_TIMEOUT}
          transitionLeaveTimeout={TRANSITION_TIMEOUT}
        >
          {this.renderContainer()}
        </Transition>
      </RenderContainer>
    );
  }

  private getZIndexProps(): ZIndexPropsType {
    const { fromLeft, blockBackground } = this.props;
    return {
      delta: 1000,
      classes: classNames(styles.root, {
        [styles.leftSide]: fromLeft
      }),
      style: blockBackground ? { width: '100%' } : undefined
    };
  }

  private renderContainer(): JSX.Element {
    const { delta, classes, style } = this.getZIndexProps();
    const footerPanelWidth = this.layoutRef
      ? this.layoutRef.getBoundingClientRect().width
      : this.getSidebarStyle().width;

    return (
      <ZIndex
        delta={delta}
        className={classes}
        onScroll={LayoutEvents.emit}
        style={style}
      >
        <RenderLayer onClickOutside={this.handleClickOutside} active>
          <div
            className={classNames(
              styles.container,
              this.state.hasShadow && styles.shadow
            )}
            style={this.getSidebarStyle()}
          >
            <table ref={_ => (this.layoutRef = _)} className={styles.layout}>
              <tbody>
                <SidePageContext.Provider
                  value={{
                    requestClose: this.requestClose,
                    width: footerPanelWidth
                  }}
                >
                  {this.props.children}
                </SidePageContext.Provider>
              </tbody>
            </table>
          </div>
        </RenderLayer>
      </ZIndex>
    );
  }

  private renderShadow(): JSX.Element {
    const { delta, classes, style } = this.getZIndexProps();
    const { blockBackground } = this.props;

    return (
      <ZIndex
        delta={delta}
        className={classes}
        onScroll={LayoutEvents.emit}
        style={style}
      >
        <HideBodyVerticalScroll allowScrolling={!blockBackground} />
        {blockBackground && (
          <div
            className={classNames(
              styles.background,
              this.state.hasBackground && styles.gray
            )}
          />
        )}
      </ZIndex>
    );
  }

  private getSidebarStyle(): React.CSSProperties {
    const sidePageStyle: React.CSSProperties = {
      width: this.props.width || (this.props.blockBackground ? 800 : 500)
    };

    if (this.state.hasMargin) {
      if (this.props.fromLeft) {
        sidePageStyle.marginLeft = 20;
      } else {
        sidePageStyle.marginRight = 20;
      }
    }

    return sidePageStyle;
  }

  private getTransitionNames(): CSSTransitionGroupTransitionName {
    const direction: 'right' | 'left' = this.props.fromLeft ? 'right' : 'left';
    const transitionEnter =
      styles[
        ('transition-enter-' + direction) as
          | 'transition-enter-left'
          | 'transition-enter-right'
      ];
    const transitionAppear =
      styles[
        ('transition-appear-' + direction) as
          | 'transition-appear-left'
          | 'transition-appear-right'
      ];

    return {
      enter: transitionEnter,
      enterActive: styles['transition-enter-active'],
      leave: styles['transition-leave'],
      leaveActive: styles['transition-leave-active'],
      appear: transitionAppear,
      appearActive: styles['transition-appear-active']
    };
  }

  private handleStackChange = (stack: ReadonlyArray<React.Component>) => {
    const sidePages = stack.filter(x => x instanceof SidePage);
    const currentSidePagePosition = sidePages.indexOf(this);
    const isSidePageOnStackTop = stack[0] instanceof SidePage;

    const hasMargin =
      sidePages.length > 1 && currentSidePagePosition === sidePages.length - 1;
    const hasShadow =
      sidePages.length < 3 || currentSidePagePosition > sidePages.length - 3;
    const hasBackground =
      currentSidePagePosition === sidePages.length - 1 && isSidePageOnStackTop;

    this.setState({
      stackPosition: stack.indexOf(this),
      hasMargin,
      hasShadow,
      hasBackground
    });
  };

  private handleClickOutside = () => {
    if (this.state.stackPosition === 0 && !this.props.ignoreBackgroundClick) {
      this.requestClose();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.state.stackPosition !== 0) {
      return;
    }
    if (event.keyCode === 27) {
      stopPropagation(event);
      this.requestClose();
    }
  };

  private requestClose = () => {
    if (this.props.disableClose) {
      return;
    }
    if (this.props.onClose) {
      this.props.onClose();
    }
  };
}

export default SidePage;
