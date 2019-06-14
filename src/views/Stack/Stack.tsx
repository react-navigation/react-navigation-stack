import * as React from 'react';
import {
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
  Platform,
  ViewProps,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { getDefaultHeaderHeight } from '../Header/HeaderSegment';
import HeaderContainer from '../Header/HeaderContainer';
import Card from './Card';
import {
  Route,
  Layout,
  TransitionSpec,
  CardStyleInterpolator,
  HeaderStyleInterpolator,
  HeaderMode,
  GestureDirection,
  SceneDescriptor,
  NavigationProp,
  HeaderScene,
} from '../../types';
import { ScreenContainer, NativeScreen } from 'react-native-screens';

type ProgressValues = {
  [key: string]: Animated.Value<number>;
};

type Props = {
  navigation: NavigationProp;
  descriptors: { [key: string]: SceneDescriptor };
  routes: Route[];
  openingRoutes: string[];
  closingRoutes: string[];
  onGoBack: (props: { route: Route }) => void;
  onOpenRoute: (props: { route: Route }) => void;
  onCloseRoute: (props: { route: Route }) => void;
  getPreviousRoute: (props: { route: Route }) => Route | undefined;
  getGesturesEnabled: (props: { route: Route }) => boolean;
  renderScene: (props: { route: Route }) => React.ReactNode;
  transparentCard?: boolean;
  headerMode: HeaderMode;
  direction: GestureDirection;
  cardOverlayEnabled?: boolean;
  cardShadowEnabled?: boolean;
  onTransitionStart?: (
    curr: { index: number },
    prev: { index: number }
  ) => void;
  onGestureBegin?: () => void;
  onGestureCanceled?: () => void;
  onGestureEnd?: () => void;
  transitionSpec: {
    open: TransitionSpec;
    close: TransitionSpec;
  };
  cardStyleInterpolator: CardStyleInterpolator;
  headerStyleInterpolator: HeaderStyleInterpolator;
};

type State = {
  routes: Route[];
  scenes: HeaderScene<Route>[];
  progress: ProgressValues;
  layout: Layout;
  floaingHeaderHeight: number;
};

const dimensions = Dimensions.get('window');
const layout = { width: dimensions.width, height: dimensions.height };

const AnimatedScreen = Animated.createAnimatedComponent(
  NativeScreen
) as React.ComponentType<
  ViewProps & { active: number | Animated.Node<number> }
>;

const { cond, eq } = Animated;

const animatedOne = new Animated.Value(1);

export default class Stack extends React.Component<Props, State> {
  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.routes === state.routes) {
      return null;
    }

    const progress = props.routes.reduce(
      (acc, curr) => {
        acc[curr.key] =
          state.progress[curr.key] ||
          new Animated.Value(
            props.openingRoutes.includes(curr.key) &&
            props.descriptors[curr.key].options.animationEnabled !== false
              ? 0
              : 1
          );

        return acc;
      },
      {} as ProgressValues
    );

    return {
      routes: props.routes,
      scenes: props.routes.map((route, index, self) => {
        const previousRoute = self[index - 1];
        const nextRoute = self[index + 1];

        const current = progress[route.key];
        const previous = previousRoute
          ? progress[previousRoute.key]
          : undefined;
        const next = nextRoute ? progress[nextRoute.key] : undefined;

        const scene = {
          route,
          previous: previousRoute,
          descriptor: props.descriptors[route.key],
          progress: {
            current,
            next,
            previous,
          },
        };

        const oldScene = state.scenes[index];

        if (
          oldScene &&
          scene.route === oldScene.route &&
          scene.progress.current === oldScene.progress.current &&
          scene.progress.next === oldScene.progress.next &&
          scene.progress.previous === oldScene.progress.previous
        ) {
          return oldScene;
        }

        return scene;
      }),
      progress,
    };
  }

  state: State = {
    routes: [],
    scenes: [],
    progress: {},
    layout,
    // Used when card's header is null and mode is float to make transition
    // between screens with headers and those without headers smooth.
    // This is not a great heuristic here. We don't know synchronously
    // on mount what the header height is so we have just used the most
    // common cases here.
    floaingHeaderHeight: getDefaultHeaderHeight(layout),
  };

  private handleLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;

    if (
      height === this.state.layout.height &&
      width === this.state.layout.width
    ) {
      return;
    }

    const layout = { width, height };

    this.setState({ layout });
  };

  private handleFloatingHeaderLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;

    if (height !== this.state.floaingHeaderHeight) {
      this.setState({ floaingHeaderHeight: height });
    }
  };

  render() {
    const {
      descriptors,
      navigation,
      cardOverlayEnabled,
      cardShadowEnabled,
      routes,
      closingRoutes,
      onOpenRoute,
      onCloseRoute,
      onGoBack,
      getPreviousRoute,
      getGesturesEnabled,
      renderScene,
      transparentCard,
      headerMode,
      direction,
      onTransitionStart,
      onGestureBegin,
      onGestureCanceled,
      onGestureEnd,
      transitionSpec,
      cardStyleInterpolator,
      headerStyleInterpolator,
    } = this.props;

    const { scenes, layout, progress, floaingHeaderHeight } = this.state;
    const focusedRoute = navigation.state.routes[navigation.state.index];

    return (
      <React.Fragment>
        <ScreenContainer style={styles.container} onLayout={this.handleLayout}>
          {routes.map((route, index, self) => {
            const focused = focusedRoute.key === route.key;
            const current = progress[route.key];
            const descriptor = descriptors[route.key];
            const scene = scenes[index];
            const next = self[index + 1]
              ? progress[self[index + 1].key]
              : animatedOne;

            // Display current screen and a screen beneath. On Android screen beneath is hidden on animation finished bs of RNS's issue.
            const isScreenActive =
              index === self.length - 1
                ? 1
                : Platform.OS === 'android'
                ? cond(eq(next, 1), 0, 1)
                : index === self.length - 2
                ? 1
                : 0;

            return (
              <AnimatedScreen
                key={route.key}
                style={StyleSheet.absoluteFill}
                active={isScreenActive}
                pointerEvents="box-none"
              >
                <Card
                  active={index === self.length - 1}
                  transparent={transparentCard}
                  direction={direction}
                  layout={layout}
                  current={current}
                  next={scene.progress.next}
                  closing={closingRoutes.includes(route.key)}
                  onOpen={() => onOpenRoute({ route })}
                  onClose={() => onCloseRoute({ route })}
                  overlayEnabled={cardOverlayEnabled}
                  shadowEnabled={cardShadowEnabled}
                  gesturesEnabled={index !== 0 && getGesturesEnabled({ route })}
                  onTransitionStart={({ closing }) => {
                    onTransitionStart &&
                      onTransitionStart(
                        { index: closing ? index - 1 : index },
                        { index }
                      );

                    closing && onGoBack({ route });
                  }}
                  onGestureBegin={onGestureBegin}
                  onGestureCanceled={onGestureCanceled}
                  onGestureEnd={onGestureEnd}
                  gestureResponseDistance={
                    descriptor.options.gestureResponseDistance
                  }
                  transitionSpec={transitionSpec}
                  styleInterpolator={cardStyleInterpolator}
                  accessibilityElementsHidden={!focused}
                  importantForAccessibility={
                    focused ? 'auto' : 'no-hide-descendants'
                  }
                  pointerEvents="box-none"
                  style={[
                    StyleSheet.absoluteFill,
                    headerMode === 'float' &&
                    descriptor &&
                    descriptor.options.header !== null
                      ? { marginTop: floaingHeaderHeight }
                      : null,
                  ]}
                >
                  {headerMode === 'screen' ? (
                    <HeaderContainer
                      mode="screen"
                      layout={layout}
                      scenes={[scenes[index - 1], scenes[index]]}
                      navigation={navigation}
                      getPreviousRoute={getPreviousRoute}
                      styleInterpolator={headerStyleInterpolator}
                      style={styles.header}
                    />
                  ) : null}
                  {renderScene({ route })}
                </Card>
              </AnimatedScreen>
            );
          })}
        </ScreenContainer>
        {headerMode === 'float' ? (
          <HeaderContainer
            mode="float"
            layout={layout}
            scenes={scenes}
            navigation={navigation}
            getPreviousRoute={getPreviousRoute}
            onLayout={this.handleFloatingHeaderLayout}
            styleInterpolator={headerStyleInterpolator}
            style={[styles.header, styles.floating]}
          />
        ) : null}
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    // This is needed to show elevation shadow
    zIndex: Platform.OS === 'android' ? 1 : 0,
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
