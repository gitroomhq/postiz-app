import { useCallback, useEffect, useRef, useState } from 'react';
export function useStateCallback(initialState) {
    const [state, setState] = useState(initialState);
    const cbRef = useRef(undefined); // init mutable ref container for callbacks
    const setStateCallback = useCallback((state, cb) => {
        cbRef.current = cb; // store current, passed callback in ref
        setState(state);
    }, []); // keep object reference stable, exactly like `useState`
    useEffect(() => {
        // cb.current is `undefined` on initial render,
        // so we only invoke callback on state *updates*
        if (cbRef.current) {
            cbRef.current(state);
            cbRef.current = undefined; // reset callback after execution
        }
    }, [state]);
    return [state, setStateCallback];
}
//# sourceMappingURL=use.state.callback.js.map