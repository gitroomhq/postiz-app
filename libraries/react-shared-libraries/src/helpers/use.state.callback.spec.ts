import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStateCallback } from './use.state.callback';

describe('useStateCallback', () => {
  it('behaves like useState when no callback is passed', () => {
    const { result } = renderHook(() => useStateCallback('first'));

    expect(result.current[0]).toBe('first');

    act(() => result.current[1]('second'));

    expect(result.current[0]).toBe('second');
  });

  it('runs the callback with the value that was just committed', () => {
    // The whole point: reading state straight after setState gives the old
    // value, so callers need somewhere to run once React has committed.
    const cb = vi.fn();
    const { result } = renderHook(() => useStateCallback(0));

    act(() => result.current[1](42, cb));

    expect(cb).toHaveBeenCalledWith(42);
    expect(result.current[0]).toBe(42);
  });

  it('does not invoke anything on the initial render', () => {
    const cb = vi.fn();
    const { result, rerender } = renderHook(() => useStateCallback('a'));

    rerender();
    expect(cb).not.toHaveBeenCalled();

    act(() => result.current[1]('b', cb));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('treats a function initial value as React lazy state, not as data', () => {
    // Inherited straight from useState: storing a function as state needs
    // `set(() => fn)`, and passing one as the initial value runs it instead.
    const initial = vi.fn(() => 'computed');
    const { result } = renderHook(() => useStateCallback(initial));

    expect(initial).toHaveBeenCalledTimes(1);
    expect(result.current[0]).toBe('computed');
  });

  it('fires the callback only once, not on every later render', () => {
    const cb = vi.fn();
    const { result, rerender } = renderHook(() => useStateCallback('a'));

    act(() => result.current[1]('b', cb));
    rerender();
    act(() => result.current[1]('c'));

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not carry a callback over to the next update', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useStateCallback('a'));

    act(() => result.current[1]('b', cb));
    act(() => result.current[1]('c'));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('b');
  });

  it('replaces a pending callback when another update arrives first', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useStateCallback('a'));

    act(() => {
      result.current[1]('b', first);
      result.current[1]('c', second);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('c');
    expect(result.current[0]).toBe('c');
  });

  it('keeps the setter reference stable across renders, like useState', () => {
    // Callers put it in dependency arrays; an unstable setter would loop.
    const { result, rerender } = renderHook(() => useStateCallback(0));
    const setter = result.current[1];

    act(() => result.current[1](1));
    rerender();

    expect(result.current[1]).toBe(setter);
  });

  it('does not fire the callback when the value is unchanged', () => {
    // React bails out of a re-render for an identical value, so the effect
    // never runs and the callback is silently dropped.
    const cb = vi.fn();
    const { result } = renderHook(() => useStateCallback('same'));

    act(() => result.current[1]('same', cb));

    expect(cb).not.toHaveBeenCalled();
  });

  it('works with object state', () => {
    const cb = vi.fn();
    const next = { id: 2 };
    const { result } = renderHook(() => useStateCallback<{ id: number }>({ id: 1 }));

    act(() => result.current[1](next, cb));

    expect(result.current[0]).toBe(next);
    expect(cb).toHaveBeenCalledWith(next);
  });

  it('supports a callback that reads the value it was handed', () => {
    const seen: string[] = [];
    const { result } = renderHook(() => useStateCallback('a'));

    act(() => result.current[1]('b', (v) => seen.push(v)));
    act(() => result.current[1]('c', (v) => seen.push(v)));

    expect(seen).toEqual(['b', 'c']);
  });
});
