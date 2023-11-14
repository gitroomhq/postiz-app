import React from 'react';
import { render } from '@testing-library/react-native';

import ReactNativeComponent from './react-native-component';

describe('ReactNativeComponent', () => {
  it('should render successfully', () => {
    const { root } = render(<ReactNativeComponent />);
    expect(root).toBeTruthy();
  });
});
