import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Upload, Trash, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const UploadSection = ({ file, setFile, onUpload, isUploading, onClear, isClearing }) => {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
            if (!file) {
              toast.error('กรุณาเลือกไฟล์ก่อน');
              return;
            }
            onUpload();
          };
          
          return (
            <Card className="bg-white/50 backdrop-blur-sm border-blue-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  จัดการข้อมูล
                </CardTitle>
                <CardDescription>
                  อัปโหลดไฟล์รายการพัสดุประจำวัน (CSV/XLSX) หรือล้างข้อมูลเก่า
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      เลือกไฟล์รายการพัสดุ
                    </label>
                    <div className="relative group">
                      <Input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        data-testid="upload-input"
                        className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Upload className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                      onClick={handleUpload} 
                      disabled={!file || isUploading}
                      data-testid="upload-submit"
                      className="flex-1 md:flex-none"
                    >
                      {isUploading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span> กำลังอัปโหลด...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" /> อัปโหลด
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={onClear}
                      disabled={isClearing}
                      data-testid="clear-old"
                      className="flex-1 md:flex-none"
                    >
                      {isClearing ? 'กำลังล้าง...' : (
                        <>
                          <Trash className="mr-2 h-4 w-4" /> ล้างข้อมูลเก่า
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
};

export default UploadSection;
