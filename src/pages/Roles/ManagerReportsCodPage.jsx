import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle } from 'lucide-react';

// Import existing pages
import ManagerReportsPage from './ManagerReportsPage';
import ManagerCODConfirmationPage from './ManagerCODConfirmationPage';

const ManagerReportsCodPage = () => {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">Báo cáo & Xác nhận COD</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Báo cáo & Hiệu suất
          </button>
          <button
            onClick={() => setActiveTab('cod')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'cod'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Xác nhận COD
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === 'reports' ? (
          <ManagerReportsPage />
        ) : (
          <ManagerCODConfirmationPage />
        )}
      </div>
    </div>
  );
};

export default ManagerReportsCodPage;
