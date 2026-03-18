'use client';
import { __awaiter } from "tslib";
import { StandaloneModal } from "../../../../../components/standalone-modal/standalone.modal";
export default function Modal() {
    return __awaiter(this, void 0, void 0, function* () {
        return (<div className="w-screen h-screen overflow-hidden bg-black">
      <div className="text-textColor h-[calc(100vh+80px)] w-[calc(100vw+80px)] -m-[40px]">
        <StandaloneModal />
      </div>
    </div>);
    });
}
//# sourceMappingURL=page.js.map