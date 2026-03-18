'use client';
import { DecisionEverywhere, ModalManager, } from "../../../../apps/frontend/src/components/layout/new-modal";
export const MantineWrapper = (props) => {
    return (<ModalManager>
      <DecisionEverywhere />
      {props.children}
    </ModalManager>);
};
//# sourceMappingURL=mantine.wrapper.js.map