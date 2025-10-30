import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  file: File;
  preview?: string;
}

interface ExcelData {
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  headers: string[];
  data: Record<string, any>[];
  allSheets: string[];
}

export const FileUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile({ file });
      setExcelData(null);
      toast({
        title: "File ready",
        description: `${file.name} is ready to be processed`,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setExcelData(null);
    toast({
      title: "File removed",
      description: "You can upload a new file now",
    });
  };

  const processFile = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('upload-excel', {
        body: formData,
      });

      if (error) throw error;

      if (data.success) {
        setExcelData(data);
        toast({
          title: "File processed successfully",
          description: `Found ${data.totalRows} rows and ${data.totalColumns} columns`,
        });
      } else {
        throw new Error(data.error || 'Failed to process file');
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process the Excel file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {!uploadedFile ? (
        <Card
          {...getRootProps()}
          className={`
            relative overflow-hidden cursor-pointer
            border-2 border-dashed transition-all duration-300
            ${isDragActive 
              ? 'border-[hsl(var(--upload-border))] bg-[hsl(var(--upload-hover))] shadow-[var(--shadow-upload)]' 
              : 'border-border bg-card hover:border-[hsl(var(--upload-border))] hover:bg-[hsl(var(--upload-bg))]'
            }
            ${isProcessing ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] shadow-[var(--shadow-upload)]">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">
              {isDragActive ? 'Drop your file here' : 'Upload Excel File'}
            </h3>
            
            <p className="text-muted-foreground mb-4 max-w-sm">
              Drag and drop your Excel file here, or click to browse
            </p>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .xlsx
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .xls
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .csv
              </span>
            </div>

            {isProcessing && (
              <div className="mt-6">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-card-foreground truncate">
                    {uploadedFile.file.name}
                  </h4>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm"
                    onClick={processFile}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] hover:opacity-90"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Process File'
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={removeFile}
                    disabled={isProcessing}
                  >
                    Upload Different File
                  </Button>
                </div>
                
                {excelData && (
                  <div className="mt-4 p-4 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                    <h5 className="font-semibold text-sm text-[hsl(var(--success))] mb-2">
                      Processing Results:
                    </h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Sheet: <span className="font-medium">{excelData.sheetName}</span></li>
                      <li>• Rows: <span className="font-medium">{excelData.totalRows}</span></li>
                      <li>• Columns: <span className="font-medium">{excelData.totalColumns}</span></li>
                      <li>• Headers: <span className="font-medium">{excelData.headers.join(', ')}</span></li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={removeFile}
              className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
