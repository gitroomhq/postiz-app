import { useDropzone } from 'react-dropzone';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import clsx from 'clsx';
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
export const DropFiles = (props) => {
    const t = useT();
    const toaster = useToaster();
    const { getRootProps, isDragActive } = useDropzone({
        onDrop: (files) => {
            if (props.disabled) {
                toaster.show('Upload current in progress, please wait and then try again.', 'warning');
                return;
            }
            props.onDrop(files);
        },
    });
    return (<div {...getRootProps()} className={clsx("relative", props.className)}>
      {isDragActive && (<div className="absolute start-0 top-0 w-full h-full bg-black/90 flex items-center justify-center z-[200] animate-normalFadeIn">
          {t('drag_n_drop_some_files_here', 'Drag n drop some files here')}
        </div>)}
      {props.children}
    </div>);
};
//# sourceMappingURL=drop.files.js.map