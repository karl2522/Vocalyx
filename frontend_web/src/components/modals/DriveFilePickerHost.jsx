import DriveFilePickerModal from './DriveFilePickerModal';

const DriveFilePickerHost = ({ isOpen, onClose, onFile }) => {
  if (!isOpen) return null;
  return (
    <DriveFilePickerModal
      isOpen={isOpen}
      onClose={onClose}
      onFileSelect={onFile}
      importType="scores"
    />
  );
};

export default DriveFilePickerHost;


