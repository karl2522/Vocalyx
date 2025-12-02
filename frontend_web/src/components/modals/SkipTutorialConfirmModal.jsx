import { X } from 'lucide-react';

const SkipTutorialConfirmModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal Content */}
      <div className="relative z-[221] w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-[#333D79] to-[#4A5491] flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Skip Interactive Tutorial?
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-3">
            <p className="text-sm text-slate-800 font-medium">
              Are you sure you want to skip the interactive tutorial?
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The tutorial lets you practice voice grading in a safe, simulated spreadsheet
              before using your real class records. You can always replay it later from the
              Class Records page.
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Keep Learning
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#2A2F66] hover:to-[#3A4080] shadow-md hover:shadow-lg transition-all"
            >
              Skip Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkipTutorialConfirmModal;


