import { corsHeaders } from '../_shared/cors.ts';

console.log('Upload Excel function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing file upload request');

    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      console.error('No file provided or invalid file');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    const isValidType = validTypes.includes(file.type) || 
                       file.name.endsWith('.xlsx') || 
                       file.name.endsWith('.xls') || 
                       file.name.endsWith('.csv');

    if (!isValidType) {
      console.error('Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload .xlsx, .xls, or .csv files' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Read the file as text (for CSV) or array buffer (for Excel)
    let parsedData: any[] = [];
    let headers: string[] = [];
    let sheetName = 'Sheet1';

    if (file.name.endsWith('.csv')) {
      // Simple CSV parsing
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          parsedData.push(obj);
        }
      }
      sheetName = 'CSV Data';
      console.log(`CSV parsed: ${parsedData.length} rows`);
    } else {
      // For Excel files, we'll use the SheetJS library dynamically
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Import SheetJS dynamically
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      
      console.log('File read successfully, parsing with SheetJS');
      
      // Parse the Excel file
      const workbook = XLSX.read(bytes, { type: 'array' });
      
      console.log(`Workbook parsed. Sheet names: ${workbook.SheetNames.join(', ')}`);
      
      // Get the first sheet
      sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (data.length > 0) {
        headers = (data[0] as any[]).map(h => String(h || ''));
        const rows = data.slice(1);
        
        // Convert to array of objects
        parsedData = rows.map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      }
      
      console.log(`Extracted ${parsedData.length} rows from sheet: ${sheetName}`);
    }

    console.log('File processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        fileName: file.name,
        sheetName: sheetName,
        totalRows: parsedData.length,
        totalColumns: headers.length,
        headers: headers,
        data: parsedData.slice(0, 100), // Return first 100 rows for preview
        preview: parsedData.slice(0, 5), // First 5 rows for quick preview
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process file', 
        details: error?.message || 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
