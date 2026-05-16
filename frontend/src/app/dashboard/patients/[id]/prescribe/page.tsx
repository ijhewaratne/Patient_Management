'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { differenceInYears } from 'date-fns';
import {
  ClinicSettings,
  Medication,
  patientAPI,
  medicationAPI,
  prescriptionAPI,
  consultationAPI,
  Consultation,
  Patient,
  Prescription,
  PrescriptionItem,
  settingsAPI,
} from '@/lib/api';
import { generatePrescriptionPDF } from '@/lib/pdf';
import { ArrowLeft, Save, Plus, Trash2, Printer } from 'lucide-react';
import Link from 'next/link';

type DraftPrescriptionItem = Omit<PrescriptionItem, 'medication_id'> & {
  medication_id: number | '';
};

export default function NewPrescription() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [previousPrescriptions, setPreviousPrescriptions] = useState<Prescription[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  
  const [selectedConsultationId, setSelectedConsultationId] = useState('');
  const [items, setItems] = useState<DraftPrescriptionItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ptData = await patientAPI.getById(Number(id));
        setPatient(ptData);
        
        const medsData = await medicationAPI.getAll();
        setMedications(medsData);

        const previousRx = await prescriptionAPI.getByPatient(Number(id));
        setPreviousPrescriptions(previousRx);

        const settings = await settingsAPI.getClinic();
        setClinicSettings(settings);
        
        const consults = await consultationAPI.getHistory(Number(id));
        setConsultations(consults);
        if (consults.length > 0) {
          setSelectedConsultationId(consults[0].consultation_id.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const addMedicationRow = () => {
    setItems([...items, {
      medication_id: '',
      medicine_name_snapshot: '',
      generic_name_snapshot: '',
      dose: '',
      frequency: '',
      timing: '',
      duration: '',
      route: '',
      medicine_status: 'new'
    }]);
  };

  const removeRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleMedicationChange = (index: number, medId: string) => {
    const med = medications.find(m => m.medication_id.toString() === medId);
    if (!med) return;
    
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      medication_id: med.medication_id,
      medicine_name_snapshot: med.brand_name || med.generic_name,
      generic_name_snapshot: med.generic_name,
      dose: med.default_dose || '',
      frequency: med.default_frequency || '',
      timing: med.default_timing || '',
      duration: med.default_duration || '',
      route: med.route || 'Oral'
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const loadPrescriptionItems = (prescription: Prescription) => {
    const repeatedItems: DraftPrescriptionItem[] = prescription.items.map((item) => ({
      medication_id: item.medication_id,
      medicine_name_snapshot: item.medicine_name_snapshot,
      generic_name_snapshot: item.generic_name_snapshot,
      brand_name_snapshot: item.brand_name_snapshot ?? '',
      strength_snapshot: item.strength_snapshot ?? '',
      dose: item.dose,
      frequency: item.frequency,
      timing: item.timing,
      duration: item.duration,
      route: item.route,
      instructions: item.instructions ?? '',
      quantity: item.quantity ?? '',
      medicine_status: item.medicine_status === 'stopped' ? 'continue' : item.medicine_status,
      change_reason: item.change_reason ?? '',
    }));
    setItems(repeatedItems);
  };

  const handleSubmit = async (e: React.FormEvent, print: boolean = false) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one medication.');
      return;
    }
    if (!patient) {
      alert('Patient details are required before saving a prescription.');
      return;
    }
    if (!selectedConsultationId) {
      alert('A consultation is required before creating a prescription.');
      return;
    }
    
    setSaving(true);
    try {
      const ageAtPrescription = differenceInYears(new Date(), new Date(patient.date_of_birth));
      const normalizedItems: PrescriptionItem[] = items.map((item) => ({
        ...item,
        medication_id: Number(item.medication_id),
      }));

      const prescData = {
        patient_id: Number(id),
        consultation_id: Number(selectedConsultationId),
        age_at_prescription: ageAtPrescription,
        status: 'confirmed',
        items: normalizedItems
      };
      
      const savedPrescription = await prescriptionAPI.create(prescData);
      
      if (print) {
        await prescriptionAPI.markPrinted(savedPrescription.prescription_id);
        generatePrescriptionPDF(patient, savedPrescription, normalizedItems, clinicSettings ?? undefined);
      }
      
      router.push(`/dashboard/patients/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/patients/${id}`} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{patient?.full_name}</h2>
            <p className="text-sm text-gray-500">Select consultation to link this prescription</p>
          </div>
          <select 
            value={selectedConsultationId} 
            onChange={(e) => setSelectedConsultationId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {consultations.map(c => (
              <option key={c.consultation_id} value={c.consultation_id}>
                {new Date(c.visit_date).toLocaleDateString()} - {c.visit_type}
              </option>
            ))}
          </select>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Repeat or modify previous prescription</h3>
              {previousPrescriptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadPrescriptionItems(previousPrescriptions[0])}
                    className="px-3 py-2 text-sm rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    Repeat Latest
                  </button>
                  {previousPrescriptions.slice(0, 3).map((prescription) => (
                    <button
                      key={prescription.prescription_id}
                      type="button"
                      onClick={() => loadPrescriptionItems(prescription)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Load {prescription.prescription_number}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No previous prescriptions available for this patient.</p>
              )}
            </div>

            <button 
              type="button" 
              onClick={addMedicationRow}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-sm font-medium text-gray-700">
                  <th className="py-3 px-4 w-64">Medication</th>
                  <th className="py-3 px-4 w-32">Dose</th>
                  <th className="py-3 px-4 w-32">Frequency</th>
                  <th className="py-3 px-4 w-32">Timing</th>
                  <th className="py-3 px-4 w-32">Duration</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 px-4">
                      <select 
                        value={item.medication_id} 
                        onChange={(e) => handleMedicationChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select Medication...</option>
                        {medications.map(m => (
                          <option key={m.medication_id} value={m.medication_id}>
                            {m.generic_name} {m.brand_name ? `(${m.brand_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="text" 
                        value={item.dose} 
                        onChange={(e) => handleItemChange(index, 'dose', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.frequency} 
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="At night">At night</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input 
                        type="text" 
                        value={item.timing} 
                        onChange={(e) => handleItemChange(index, 'timing', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. After meals"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.duration} 
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="1 week">1 week</option>
                        <option value="2 weeks">2 weeks</option>
                        <option value="1 month">1 month</option>
                        <option value="2 months">2 months</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.medicine_status} 
                        onChange={(e) => handleItemChange(index, 'medicine_status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="new">New</option>
                        <option value="continue">Continue</option>
                        <option value="changed">Changed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" onClick={() => removeRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No medications added yet. Click &quot;Add Medication&quot; to start prescribing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, false)} 
            disabled={saving} 
            className="flex items-center gap-2 px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Only
          </button>
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, true)} 
            disabled={saving} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Save & Print PDF
          </button>
        </div>
      </div>
    </div>
  );
}
