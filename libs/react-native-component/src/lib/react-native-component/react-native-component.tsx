import React from 'react';

import { View, Text } from 'react-native';

/* eslint-disable-next-line */
export interface ReactNativeComponentProps {}

export function ReactNativeComponent(props: ReactNativeComponentProps) {
  return (
    <View>
      <Text>Welcome to react-native-component!</Text>
    </View>
  );
}

export default ReactNativeComponent;
