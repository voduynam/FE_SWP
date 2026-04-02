import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { appDialogRef } from '../utils/appDialogRef';

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const finish = useCallback((value) => {
    setDialog((d) => {
      if (d?.resolve) d.resolve(value);
      return null;
    });
  }, []);

  const showAlert = useCallback((message, title = 'Thông báo') => {
    return new Promise((resolve) => {
      setDialog({ type: 'alert', title, message, resolve });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Xác nhận') => {
    return new Promise((resolve) => {
      setDialog({ type: 'confirm', title, message, resolve });
    });
  }, []);

  useEffect(() => {
    appDialogRef.current = { showAlert, showConfirm };
    return () => {
      appDialogRef.current = null;
    };
  }, [showAlert, showConfirm]);

  const value = { showAlert, showConfirm };

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog &&
        createPortal(
          <div
            className='fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4'
            role='presentation'
            onClick={() => {
              if (dialog.type === 'alert') finish();
              else finish(false);
            }}
          >
            <div
              className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl'
              role='alertdialog'
              aria-modal='true'
              aria-labelledby='app-dialog-title'
              onClick={e => e.stopPropagation()}
            >
              <h3 id='app-dialog-title' className='text-lg font-semibold text-slate-900'>
                {dialog.title}
              </h3>
              <p className='mt-2 max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-600'>
                {dialog.message}
              </p>
              <div className='mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4'>
                {dialog.type === 'confirm' && (
                  <button
                    type='button'
                    onClick={() => finish(false)}
                    className='rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                  >
                    Hủy
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => finish(dialog.type === 'confirm' ? true : undefined)}
                  className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800'
                >
                  {dialog.type === 'confirm' ? 'Đồng ý' : 'Đóng'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error('useAppDialog cần bọc trong AppDialogProvider');
  return ctx;
}
