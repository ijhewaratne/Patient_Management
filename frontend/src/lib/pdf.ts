import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ClinicSettings, Patient, Prescription, PrescriptionItem } from '@/lib/api';

const DEFAULT_SETTINGS: Partial<ClinicSettings> = {
  clinic_name: 'Psychiatric Clinic',
  clinic_address: '',
  clinic_phone: '',
  doctor_name: 'Doctor Name',
  doctor_qualification: '',
  doctor_registration_number: '',
  prescription_footer: '',
};

export const generatePrescriptionPDF = (
  patient: Patient,
  prescription: Prescription,
  items: PrescriptionItem[],
  settings?: Partial<ClinicSettings>,
  layout: 'a4' | 'a5' = 'a4',
) => {
  const clinic = { ...DEFAULT_SETTINGS, ...settings };
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: layout,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(clinic.clinic_name || 'Psychiatric Clinic', pageWidth / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const doctorLine = [clinic.doctor_name, clinic.doctor_qualification].filter(Boolean).join(', ');
  if (doctorLine) {
    doc.text(doctorLine, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  
  if (clinic.doctor_registration_number) {
    doc.text(`SLMC Reg No: ${clinic.doctor_registration_number}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  
  const contactLine = [clinic.clinic_address, clinic.clinic_phone ? `Phone: ${clinic.clinic_phone}` : '']
    .filter(Boolean)
    .join(' | ');
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
  }

  // Line
  y += 10;
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  
  // Patient Details
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient Name:`, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.full_name}`, 45, y);

  doc.setFont('helvetica', 'bold');
  doc.text(`Date:`, pageWidth - 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${format(new Date(), 'PP')}`, pageWidth - 45, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Age/Gender:`, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${prescription.age_at_prescription} / ${patient.gender}`, 45, y);

  doc.setFont('helvetica', 'bold');
  doc.text(`Prescription No:`, pageWidth - 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${prescription.prescription_number}`, pageWidth - 25, y);

  // Line
  y += 10;
  doc.line(15, y, pageWidth - 15, y);

  // RX symbol
  y += 15;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rx', 15, y);

  // Medications
  y += 10;
  doc.setFontSize(11);
  
  items.forEach((item, index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.medicine_name_snapshot}`, 20, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.dose} - ${item.frequency} - ${item.timing}`, 25, y);
    
    y += 5;
    doc.text(`Duration: ${item.duration}`, 25, y);
    
    if (item.instructions) {
      y += 5;
      doc.text(`Instructions: ${item.instructions}`, 25, y);
    }
    
    y += 10;

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFont('helvetica', 'normal');
  doc.text('Doctor Signature: _______________________', pageWidth - 15, footerY, { align: 'right' });
  
  doc.setFontSize(9);
  doc.text('Next Review Date: ' + (prescription.next_review_date ? format(new Date(prescription.next_review_date), 'PP') : 'As advised'), 15, footerY);
  if (clinic.prescription_footer) {
    doc.text(clinic.prescription_footer, 15, footerY + 6);
  }

  doc.save(`Prescription_${prescription.prescription_number}.pdf`);
};
