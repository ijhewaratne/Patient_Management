'use client';

import { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { ClinicSettings, settingsAPI } from '@/lib/api';

type ClinicSettingsForm = Omit<ClinicSettings, 'clinic_id' | 'updated_at'>;

const EMPTY_FORM: ClinicSettingsForm = {
  clinic_name: '',
  clinic_address: '',
  clinic_phone: '',
  doctor_name: '',
  doctor_qualification: '',
  doctor_registration_number: '',
  prescription_footer: '',
  signature_image_optional: '',
};

export default function SettingsPage() {
  const [formData, setFormData] = useState<ClinicSettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.getClinic();
        setFormData({
          clinic_name: settings.clinic_name ?? '',
          clinic_address: settings.clinic_address ?? '',
          clinic_phone: settings.clinic_phone ?? '',
          doctor_name: settings.doctor_name ?? '',
          doctor_qualification: settings.doctor_qualification ?? '',
          doctor_registration_number: settings.doctor_registration_number ?? '',
          prescription_footer: settings.prescription_footer ?? '',
          signature_image_optional: settings.signature_image_optional ?? '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.updateClinic(formData);
      alert('Clinic settings saved.');
    } catch (err) {
      console.error(err);
      alert('Failed to save clinic settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Clinic Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">These details are used on printed prescriptions.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
              <input
                type="text"
                name="clinic_name"
                value={formData.clinic_name ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Phone</label>
              <input
                type="text"
                name="clinic_phone"
                value={formData.clinic_phone ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
              <textarea
                name="clinic_address"
                value={formData.clinic_address ?? ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
              <input
                type="text"
                name="doctor_name"
                value={formData.doctor_name ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Qualification</label>
              <input
                type="text"
                name="doctor_qualification"
                value={formData.doctor_qualification ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLMC / Registration Number</label>
              <input
                type="text"
                name="doctor_registration_number"
                value={formData.doctor_registration_number ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature Image Path, optional</label>
              <input
                type="text"
                name="signature_image_optional"
                value={formData.signature_image_optional ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Footer</label>
              <textarea
                name="prescription_footer"
                value={formData.prescription_footer ?? ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
