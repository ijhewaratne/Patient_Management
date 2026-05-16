'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  fetchPrescriptionPrintData,
  PrescriptionPrintData,
  prescriptionAPI,
} from '@/lib/api';

export default function PrescriptionPrintPage() {
  const { prescriptionId } = useParams();
  const [data, setData] = useState<PrescriptionPrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasTriggeredPrint = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const prescription = await fetchPrescriptionPrintData(Number(prescriptionId));
        if (prescription.status === 'confirmed') {
          const printed = await prescriptionAPI.markPrinted(Number(prescriptionId));
          prescription.status = printed.status;
          prescription.printed_at = printed.printed_at;
        }
        setData(prescription);
      } catch (err) {
        console.error(err);
        setError('Failed to load prescription print view.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [prescriptionId]);

  useEffect(() => {
    if (!data || hasTriggeredPrint.current) {
      return;
    }
    hasTriggeredPrint.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (loading) {
    return <div className="p-8">Loading print view...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-red-600">{error || 'Prescription not found.'}</div>;
  }

  const { clinic, doctor, patient, items } = data;

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/patients/${patient.patient_id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <article className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-gray-300 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {clinic.clinic_name || 'Psychiatric Clinic'}
          </h1>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>{[clinic.doctor_name || doctor.name, clinic.doctor_qualification].filter(Boolean).join(', ')}</p>
            {clinic.doctor_registration_number && (
              <p>Registration No: {clinic.doctor_registration_number}</p>
            )}
            {clinic.clinic_address && <p>{clinic.clinic_address}</p>}
            {clinic.clinic_phone && <p>Phone: {clinic.clinic_phone}</p>}
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Patient</h2>
            <p className="text-lg font-semibold text-gray-900">{patient.full_name}</p>
            <p className="text-sm text-gray-700">DOB: {format(new Date(patient.date_of_birth), 'PPP')}</p>
            <p className="text-sm text-gray-700">Gender: {patient.gender}</p>
            <p className="text-sm text-gray-700">Address: {patient.address || 'Not recorded'}</p>
            <p className="text-sm text-gray-700">Phone: {patient.phone || 'Not recorded'}</p>
          </div>
          <div className="space-y-2 md:text-right">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Prescription</h2>
            <p className="text-lg font-semibold text-gray-900">{data.prescription_number}</p>
            <p className="text-sm text-gray-700">Date: {format(new Date(data.prescription_date), 'PPP')}</p>
            <p className="text-sm text-gray-700">Age: {data.age_at_prescription}</p>
            <p className="text-sm text-gray-700">Status: {data.status}</p>
            {data.next_review_date && (
              <p className="text-sm text-gray-700">
                Next review: {format(new Date(data.next_review_date), 'PPP')}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 text-3xl font-semibold text-gray-900">Rx</div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Medication</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Dose</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Frequency</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Timing</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.item_id}>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-gray-900">{item.medicine_name_snapshot}</div>
                      {item.generic_name_snapshot !== item.medicine_name_snapshot && (
                        <div className="text-xs text-gray-500">{item.generic_name_snapshot}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-gray-700">{item.dose}</td>
                    <td className="px-4 py-4 align-top text-gray-700">{item.frequency}</td>
                    <td className="px-4 py-4 align-top text-gray-700">{item.timing}</td>
                    <td className="px-4 py-4 align-top text-gray-700">{item.duration}</td>
                    <td className="px-4 py-4 align-top text-gray-700">
                      {item.instructions || item.route || 'As directed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="text-sm text-gray-600">
            {clinic.prescription_footer || 'Review and continue only as clinically appropriate.'}
          </div>
          <div className="md:text-right">
            <div className="mx-auto h-px w-56 bg-gray-400 md:ml-auto md:mr-0" />
            <p className="mt-3 text-sm font-medium text-gray-900">
              {clinic.doctor_name || doctor.name}
            </p>
            <p className="text-sm text-gray-600">
              {clinic.doctor_qualification || doctor.role}
            </p>
          </div>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          html,
          body {
            background: #fff !important;
          }

          body * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
