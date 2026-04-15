import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileText } from "lucide-react";
import {
  calculateTotalMarks,
  calculateTotalMaxMarks,
  calculatePercentage,
  getGrade,
  getSubjectWiseAverage,
  type GradeResult,
} from "@/utils/gradeUtils";
import type { StudentInfo, MarksEntry } from "@/services/marksService";

interface MarksMemoProps {
  student: StudentInfo;
  marks: MarksEntry[];
  attendance?: {
    total: number;
    present: number;
    percentage: number;
  };
  academicYear?: string;
  term?: string;
  examType?: string;
  remarks?: string;
  showActions?: boolean;
}

export default function MarksMemo({
  student,
  marks,
  attendance,
  academicYear = "2024-25",
  term,
  examType,
  remarks,
  showActions = true,
}: MarksMemoProps) {
  const memoRef = useRef<HTMLDivElement>(null);

  const subjectAverages = getSubjectWiseAverage(marks);
  const totalObtained = calculateTotalMarks(marks);
  const totalMax = calculateTotalMaxMarks(marks);
  const percentage = calculatePercentage(totalObtained, totalMax);
  const overallGrade = getGrade(totalObtained, totalMax);

  const downloadPDF = async () => {
    if (!memoRef.current) return;

    const canvas = await html2canvas(memoRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`${student.name}_Marks_Memo_${academicYear}.pdf`);
  };

  const printMemo = () => {
    if (!memoRef.current) return;
    const printContent = memoRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Marks Memo - ${student.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f5f5f5; }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={printMemo}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={downloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      )}

      <div ref={memoRef} className="bg-white p-6 rounded-lg border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-800">SCHOOL MANAGEMENT SYSTEM</h1>
            <h2 className="text-lg font-semibold text-gray-600">Marks Memo / Report Card</h2>
            <p className="text-sm text-gray-500 mt-1">
              Academic Year: {academicYear}
              {term && ` | Term: ${term}`}
              {examType && ` | Exam: ${examType.replace("_", " ")}`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Student Name</p>
              <p className="font-semibold text-gray-800">{student.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Roll Number</p>
              <p className="font-semibold text-gray-800">{student.rollNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-semibold text-gray-800">{student.className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Section</p>
              <p className="font-semibold text-gray-800">{student.sectionName}</p>
            </div>
          </div>

          <Table className="mb-6">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Max Marks</TableHead>
                <TableHead className="text-right">Marks Obtained</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectAverages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No marks available
                  </TableCell>
                </TableRow>
              ) : (
                subjectAverages.map((subject, index) => (
                  <TableRow key={subject.subject}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{subject.subject}</TableCell>
                    <TableCell className="text-right">{subject.max}</TableCell>
                    <TableCell className="text-right">{subject.obtained}</TableCell>
                    <TableCell className="text-right">{subject.percentage}%</TableCell>
                    <TableCell className="text-center">
                      <span
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{
                          backgroundColor: subject.grade.color + "20",
                          color: subject.grade.color,
                        }}
                      >
                        {subject.grade.grade}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-gray-500">Total Marks</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totalObtained} / {totalMax}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-gray-500">Percentage</p>
                <p className="text-2xl font-bold text-gray-800">{percentage}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-gray-500">Overall Grade</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: overallGrade.color }}
                >
                  {overallGrade.grade}
                </p>
              </CardContent>
            </Card>
          </div>

          {attendance && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Attendance</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Days: </span>
                  <span className="font-medium">{attendance.total}</span>
                </div>
                <div>
                  <span className="text-gray-500">Present: </span>
                  <span className="font-medium">{attendance.present}</span>
                </div>
                <div>
                  <span className="text-gray-500">Attendance: </span>
                  <span className="font-medium">{attendance.percentage}%</span>
                </div>
              </div>
            </div>
          )}

          {remarks && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Remarks</h3>
              <p className="text-sm text-gray-600">{remarks}</p>
            </div>
          )}

          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Generated by School Management System</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}