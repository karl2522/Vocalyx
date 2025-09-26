import { Check, Edit, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { classRecordService } from '../../services/api';

const PerfectScoreManagerModal = ({ 
    isOpen, 
    onClose, 
    sheetId, 
    sheetName = null,
    onUpdate = null 
}) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingScores, setEditingScores] = useState({}); // Track which scores are being edited
    const [pendingUpdates, setPendingUpdates] = useState({}); // Track pending changes

    const fetchCategoryStructure = async () => {
        if (!sheetId) return;

        try {
            setLoading(true);
            const response = await classRecordService.getCategoryStructure(sheetId, sheetName);
            
            if (response.data.success) {
                setCategories(response.data.categories);
            } else {
                toast.error(`Failed to load categories: ${response.data.error}`);
            }
        } catch (error) {
            console.error('Error fetching category structure:', error);
            toast.error('Failed to load category structure');
        } finally {
            setLoading(false);
        }
    };

    const handleScoreEdit = (columnName, newScore) => {
        setPendingUpdates(prev => ({
            ...prev,
            [columnName]: newScore
        }));
    };

    const handleSaveScore = async (columnName) => {
        const newScore = pendingUpdates[columnName];
        
        if (!newScore || isNaN(newScore) || newScore <= 0) {
            toast.error('Please enter a valid positive number');
            return;
        }

        try {
            setSaving(true);
            const updates = [{
                column_name: columnName,
                perfect_score: parseInt(newScore)
            }];

            const response = await classRecordService.updateCategoryPerfectScores(sheetId, updates, sheetName);
            
            if (response.data.success) {
                // Update local state
                setCategories(prev => prev.map(category => ({
                    ...category,
                    subcategories: category.subcategories.map(sub => 
                        sub.column_name === columnName 
                            ? { ...sub, perfect_score: parseInt(newScore) }
                            : sub
                    )
                })));

                // Remove from pending updates and editing states
                setPendingUpdates(prev => {
                    const updated = { ...prev };
                    delete updated[columnName];
                    return updated;
                });
                setEditingScores(prev => {
                    const updated = { ...prev };
                    delete updated[columnName];
                    return updated;
                });

                toast.success(`✅ Updated ${columnName} perfect score to ${newScore}`);
                
                if (onUpdate) {
                    onUpdate();
                }
            } else {
                toast.error(`Failed to update perfect score: ${response.data.error}`);
            }
        } catch (error) {
            console.error('Error updating perfect score:', error);
            toast.error('Failed to update perfect score');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = (columnName) => {
        setEditingScores(prev => {
            const updated = { ...prev };
            delete updated[columnName];
            return updated;
        });
        setPendingUpdates(prev => {
            const updated = { ...prev };
            delete updated[columnName];
            return updated;
        });
    };

    const startEditing = (columnName, currentScore) => {
        setEditingScores(prev => ({ ...prev, [columnName]: true }));
        setPendingUpdates(prev => ({ ...prev, [columnName]: currentScore.toString() }));
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategoryStructure();
        }
    }, [isOpen, sheetId, sheetName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Perfect Score Manager</h2>
                        <p className="text-gray-600 mt-1">
                            Manage perfect scores for each subcategory independently
                            {sheetName && <span className="text-blue-600 ml-2">• {sheetName}</span>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={saving}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading categories...</span>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <Edit size={48} className="mx-auto" />
                            </div>
                            <p className="text-gray-600 text-lg mb-2">No categories found</p>
                            <p className="text-gray-500">Create some categories to manage perfect scores</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {categories.map((category, categoryIndex) => (
                                <div key={categoryIndex} className="border rounded-lg p-6 bg-gray-50">
                                    {/* Category Header */}
                                    <div className="flex items-center mb-4">
                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            {category.name}
                                        </div>
                                        <span className="ml-3 text-gray-500 text-sm">
                                            {category.subcategories.length} subcategories
                                        </span>
                                    </div>

                                    {/* Subcategories Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {category.subcategories.map((subcategory) => {
                                            const isEditing = editingScores[subcategory.column_name];
                                            const pendingValue = pendingUpdates[subcategory.column_name];
                                            const displayValue = isEditing ? pendingValue : subcategory.perfect_score;

                                            return (
                                                <div 
                                                    key={subcategory.column_name}
                                                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                                                >
                                                    {/* Subcategory Name */}
                                                    <div className="text-sm font-medium text-gray-900 mb-3 break-words">
                                                        {subcategory.column_name}
                                                    </div>

                                                    {/* Perfect Score Input/Display */}
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-gray-500 mb-1 block">
                                                                Perfect Score
                                                            </label>
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={pendingValue || ''}
                                                                    onChange={(e) => handleScoreEdit(subcategory.column_name, e.target.value)}
                                                                    className="w-full px-3 py-2 border rounded-md text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    autoFocus
                                                                    disabled={saving}
                                                                />
                                                            ) : (
                                                                <div className="w-full px-3 py-2 bg-gray-50 border rounded-md text-center font-semibold text-lg text-blue-600">
                                                                    {displayValue}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex flex-col space-y-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleSaveScore(subcategory.column_name)}
                                                                        disabled={saving || !pendingValue || isNaN(pendingValue) || pendingValue <= 0}
                                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        title="Save changes"
                                                                    >
                                                                        {saving ? (
                                                                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <Check size={16} />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleCancelEdit(subcategory.column_name)}
                                                                        disabled={saving}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="Cancel editing"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => startEditing(subcategory.column_name, subcategory.perfect_score)}
                                                                    disabled={saving}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                    title="Edit perfect score"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            💡 <strong>Tip:</strong> Changes are saved individually - click the edit icon next to any perfect score to modify it independently.
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                            disabled={saving}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerfectScoreManagerModal;