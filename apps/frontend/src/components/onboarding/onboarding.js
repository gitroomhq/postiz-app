'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModals } from "../layout/new-modal";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { OnboardingModal } from "./onboarding.modal";
export const Onboarding = () => {
    const query = useSearchParams();
    const modal = useModals();
    const router = useRouter();
    const modalOpen = useRef(false);
    const t = useT();
    const handleClose = useCallback(() => {
        modal.closeAll();
        router.push('/launches');
    }, [modal, router]);
    useEffect(() => {
        const onboarding = query.get('onboarding');
        if (!onboarding) {
            if (modalOpen.current) {
                modalOpen.current = false;
                modal.closeAll();
            }
            return;
        }
        if (modalOpen.current) {
            return;
        }
        modalOpen.current = true;
        modal.openModal({
            // title: t('onboarding', 'Welcome to Postiz'),
            withCloseButton: true,
            closeOnEscape: false,
            removeLayout: true,
            askClose: true,
            fullScreen: true,
            onClose: handleClose,
            children: <OnboardingModal onClose={handleClose}/>,
        });
    }, [query, handleClose, t]);
    return null;
};
//# sourceMappingURL=onboarding.js.map