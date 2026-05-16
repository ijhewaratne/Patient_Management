'use client';

import { useState, useEffect } from 'react';
import { Medication, medicationAPI } from '@/lib/api';
import { Database, Search } from 'lucide-react';

export default function MedicationMaster() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const data = await medicationAPI.getAll();
        setMedications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeds();
  }, []);

  const filteredMeds = medications.filter(m => 
    m.generic_name.toLowerCase().includes(search.toLowerCase()) || 
    (m.brand_name && m.brand_name.toLowerCase().includes(search.toLowerCase())) ||
    m.drug_class?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-6 h-6 text-indigo-600" />
          Medication Master
        </h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Add New Medication
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <input 
              type="text"
              placeholder="Search medications by generic name, brand, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading medications...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-sm font-medium text-gray-500">
                  <th className="py-4 px-6">Generic Name</th>
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Default Dose</th>
                  <th className="py-4 px-6">Default Frequency</th>
                  <th className="py-4 px-6">Route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMeds.map((med) => (
                  <tr key={med.medication_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-gray-900">{med.generic_name}</p>
                      {med.brand_name && <p className="text-sm text-gray-500">{med.brand_name}</p>}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                        {med.drug_class}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-700">{med.default_dose}</td>
                    <td className="py-4 px-6 text-gray-700">{med.default_frequency}</td>
                    <td className="py-4 px-6 text-gray-700">{med.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMeds.length === 0 && (
              <div className="p-8 text-center text-gray-500">No medications found matching &quot;{search}&quot;</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
