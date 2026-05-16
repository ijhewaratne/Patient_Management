'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, PlusCircle, Users } from 'lucide-react';
import { Patient, patientAPI } from '@/lib/api';
import { format } from 'date-fns';

export default function PatientsIndexPage() {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async (search = '') => {
    setLoading(true);
    try {
      const data = await patientAPI.search(search);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    patientAPI.search()
      .then((data) => {
        setPatients(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadPatients(query);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600" />
            Patients
          </h1>
          <p className="text-sm text-gray-500 mt-1">Search by name, phone, DOB, address, or patient ID.</p>
        </div>
        <Link
          href="/dashboard/patients/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Patient
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search patients..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-10 pr-24 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
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

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No patients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-sm font-medium text-gray-500">
                  <th className="py-4 px-6">Patient ID</th>
                  <th className="py-4 px-6">Full Name</th>
                  <th className="py-4 px-6">DOB</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Address</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <tr key={patient.patient_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">
                      PT-{patient.patient_id.toString().padStart(4, '0')}
                    </td>
                    <td className="py-4 px-6 text-gray-800">{patient.full_name}</td>
                    <td className="py-4 px-6 text-gray-600">{format(new Date(patient.date_of_birth), 'PP')}</td>
                    <td className="py-4 px-6 text-gray-600">{patient.phone}</td>
                    <td className="py-4 px-6 text-gray-600">{patient.address}</td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/dashboard/patients/${patient.patient_id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                      >
                        Open Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
