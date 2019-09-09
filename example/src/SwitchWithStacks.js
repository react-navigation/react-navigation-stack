import * as React from 'react';
import {
  ActivityIndicator,
  Button,
  AsyncStorage,
  StyleSheet,
  View,
} from 'react-native';
import { createSwitchNavigator, Themed } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

class SignInScreen extends React.Component<any, any> {
  static navigationOptions = {
    title: 'Please sign in',
  };

  render() {
    return (
      <View style={styles.container}>
        <Button title="Sign in!" onPress={this._signInAsync} />
        <Button
          title="Go back to other examples"
          onPress={() => this.props.navigation.goBack(null)}
        />
        <Themed.StatusBar />
      </View>
    );
  }

  _signInAsync = async () => {
    await AsyncStorage.setItem('userToken', 'abc');
    this.props.navigation.navigate('Home');
  };
}

class HomeScreen extends React.Component<any, any> {
  static navigationOptions = {
    title: 'Welcome to the app!',
  };

  render() {
    return (
      <View style={styles.container}>
        <Button title="Show me more of the app" onPress={this._showMoreApp} />
        <Button title="Actually, sign me out :)" onPress={this._signOutAsync} />
        <Themed.StatusBar />
      </View>
    );
  }

  _showMoreApp = () => {
    this.props.navigation.navigate('Other');
  };

  _signOutAsync = async () => {
    await AsyncStorage.clear();
    this.props.navigation.navigate('Auth');
  };
}

class OtherScreen extends React.Component<any, any> {
  static navigationOptions = {
    title: 'Lots of features here',
  };

  render() {
    return (
      <View style={styles.container}>
        <Button title="I'm done, sign me out" onPress={this._signOutAsync} />
        <Themed.StatusBar />
      </View>
    );
  }

  _signOutAsync = async () => {
    await AsyncStorage.clear();
    this.props.navigation.navigate('Auth');
  };
}

class LoadingScreen extends React.Component<any, any> {
  componentDidMount() {
    this._bootstrapAsync();
  }

  _bootstrapAsync = async () => {
    const userToken = await AsyncStorage.getItem('userToken');
    let initialRouteName = userToken ? 'App' : 'Auth';
    this.props.navigation.navigate(initialRouteName);
  };

  render() {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Themed.StatusBar />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const AppStack = createStackNavigator({ Home: HomeScreen, Other: OtherScreen });
const AuthStack = createStackNavigator({ SignIn: SignInScreen });

export default createSwitchNavigator({
  Loading: LoadingScreen,
  App: AppStack,
  Auth: AuthStack,
});
