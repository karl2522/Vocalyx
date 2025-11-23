import DriveFilePickerModal from './DriveFilePickerModal';

const DriveFilePickerHost = ({ isOpen, onClose, onFile, importType = 'scores' }) => {
  if (!isOpen) return null;
  return (
    <DriveFilePickerModal
      isOpen={isOpen}
      onClose={onClose}
      onFileSelect={onFile}
      importType={importType}
    />
  );
};

export default DriveFilePickerHost;


