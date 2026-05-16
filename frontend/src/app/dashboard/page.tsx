'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, PlusCircle, Calendar, FileText } from 'lucide-react';
import { Patient, patientAPI } from '@/lib/api';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await patientAPI.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link 
            href="/dashboard/patients/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            New Patient
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Quick Search</p>
            <p className="text-lg font-semibold text-gray-900">Find Patient</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Appointments</p>
            <p className="text-lg font-semibold text-gray-900">Today</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">System Backup</p>
            <p className="text-lg font-semibold text-gray-900">Up to date</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Patients</h2>
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <input 
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <button 
              type="submit" 
              className="absolute right-2 top-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium text-sm hover:bg-indigo-100 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
        
        {searchResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-sm font-medium text-gray-500">
                  <th className="py-4 px-6">Patient ID</th>
                  <th className="py-4 px-6">Full Name</th>
                  <th className="py-4 px-6">DOB</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">PT-{p.patient_id.toString().padStart(4, '0')}</td>
                    <td className="py-4 px-6 text-gray-800">{p.full_name}</td>
                    <td className="py-4 px-6 text-gray-600">{p.date_of_birth}</td>
                    <td className="py-4 px-6 text-gray-600">{p.phone}</td>
                    <td className="py-4 px-6 text-right">
                      <Link 
                        href={`/dashboard/patients/${p.patient_id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {isSearching && searchResults.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No patients found matching your query.
          </div>
        )}
      </div>
    </div>
  );
}
