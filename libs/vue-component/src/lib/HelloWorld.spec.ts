import { mount } from '@vue/test-utils';
import HelloWorld from './HelloWorld.vue';

describe('HelloWorld', () => {
  it('renders a greeting', () => {
    const wrapper = mount(HelloWorld);
    const greeting = wrapper.find('h1');

    expect(greeting.exists()).toBe(true);
    expect(greeting.text()).toBe('Hello World');
  });
});
