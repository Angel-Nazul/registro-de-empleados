import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
}

const widths = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

const Modal = ({ title, subtitle, children, footer, onClose, size = 'lg' }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Cerrar modal"
      className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    />
    <div
      className={`relative z-10 flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto px-6 py-5">{children}</div>

      {footer && (
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  </div>
);

export default Modal;
