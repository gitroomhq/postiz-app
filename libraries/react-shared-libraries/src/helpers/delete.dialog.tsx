import Swal from 'sweetalert2';
import i18next from '@gitroom/react/translation/i18next';

export const deleteDialog = async (
  message: string,
  confirmButton?: string,
  title?: string
) => {
  const fire = await Swal.fire({
    title: title || i18next.t('are_you_sure', 'Are you sure?'),
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText:
      confirmButton || i18next.t('yes_delete_it', 'Yes, delete it!'),
    cancelButtonText: i18next.t('no_cancel', 'No, cancel!'),
  });
  return fire.isConfirmed;
};
