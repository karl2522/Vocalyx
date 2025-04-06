import { Link, useNavigate } from "react-router-dom";
import { logo } from "../utils";
import { Upload, FileSpreadsheet, Clock, LogOut, Download } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useState } from 'react';

function Dashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [excelData, setExcelData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleExport = async (id) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/excel/${id}/download/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported_data.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setLoading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const token = localStorage.getItem('authToken');
                console.log('Sending request to:', 'http://127.0.0.1:8000/api/excel/upload/');
                console.log('Token:', token);

                const response = await fetch('http://127.0.0.1:8000/api/excel/upload/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    let errorMessage;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || 'Upload failed';
                    } catch (e) {
                        errorMessage = `Upload failed with status ${response.status}`;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('Response data:', data);
                setExcelData(data);
            } catch (err) {
                setError(err.message);
                console.error('Upload error:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-[100vh] w-screen bg-white flex flex-col">
            {/* Navigation */}
            <nav className="w-full px-12 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex justify-center items-center">
                        <img
                            src={logo}
                            alt="Vocalyx Logo"
                            width={150}
                            height={50}
                            className="h-20 w-auto"
                        />
                        <h1 className="text-3xl font-bold text-black pl-5">Vocalyx</h1>
                    </div>

                    {/* Nav Links and Logout */}
                    <div className="flex items-center space-x-12">
                        <Link href="#features" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                            Features
                        </Link>
                        <Link href="#solutions" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                            Solutions
                        </Link>
                        <Link href="#about" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                            About
                        </Link>
                        <Link href="#contact" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                            Contact
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#333D79] text-white rounded-xl hover:bg-[#222A5F] transition-all duration-300 hover:-translate-y-1"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 px-12 py-8">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-bold text-[#333D79]">Welcome</h2>
                        <div className="flex items-center mt-2 text-gray-600">
                            <Clock className="w-5 h-5 mr-2" />
                            <span>2025-04-03 05:44:13 UTC</span>
                        </div>
                    </div>
                </div>

                {/* Import Card */}
                <div className="bg-gradient-to-br from-[#333D79] to-[#222A5F] rounded-2xl p-1">
                    <div className="bg-white rounded-2xl p-8">
                        <div className="flex flex-col items-center justify-center space-y-8">
                            {/* Upload Area */}
                            <div className="w-full max-w-3xl">
                                <label
                                    htmlFor="file-upload"
                                    className="group flex flex-col items-center justify-center w-full h-80 border-3 border-[#333D79] border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="relative">
                                            <FileSpreadsheet className="w-24 h-24 text-[#333D79] mb-4 group-hover:scale-110 transition-transform duration-300" />
                                            <Upload className="absolute bottom-4 right-0 w-10 h-10 text-[#333D79] bg-white rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                        <p className="mb-2 text-2xl text-gray-700">
                                            <span className="font-semibold">Drop your Excel file here</span>
                                        </p>
                                        <p className="text-base text-gray-500">or click to browse</p>
                                        <p className="mt-2 text-sm text-[#333D79]">Supported formats: XLSX, XLS</p>
                                    </div>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>

                            {/* Import Button */}
                            <button
                                className="group px-10 py-4 bg-[#333D79] text-white rounded-xl hover:bg-[#222A5F] transition-all duration-300 flex items-center space-x-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                onClick={() => document.getElementById('file-upload').click()}
                            >
                                <Upload className="w-6 h-6 group-hover:animate-bounce" />
                                <span>Import Excel File</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {excelData && (
                <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-[#333D79]">
                            Imported Data: {excelData.file_name}
                        </h3>
                        <button
                            onClick={() => handleExport(excelData.id)}
                            className="flex items-center space-x-2 px-6 py-3 bg-[#333D79] text-white rounded-xl hover:bg-[#222A5F] transition-all duration-300"
                        >
                            <Download className="w-5 h-5" />
                            <span>Export to Excel</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                {excelData.data && excelData.data[0] &&
                                    Object.keys(excelData.data[0].row_data).map((header) => (
                                        <th
                                            key={header}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {header}
                                        </th>
                                    ))
                                }
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {excelData.data && excelData.data.map((row) => (
                                <tr key={row.row_index}>
                                    {Object.values(row.row_data).map((value, idx) => (
                                        <td
                                            key={idx}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                        >
                                            {value}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#333D79] mx-auto"></div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
        </div>
    );
}

export default Dashboard;