import fs from 'fs';
import FormData from 'form-data';

async function testConversion() {
  console.log('🧪 Testing F.Conv Performance Optimizations\n');
  
  // Dynamic import for node-fetch
  const { default: fetch } = await import('node-fetch');
  
  // Create a simple test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5C, 0xC2, 0x5D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const qualities = ['fast', 'medium', 'high'];
  
  for (const quality of qualities) {
    console.log(`Testing ${quality} quality conversion...`);
    
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    formData.append('format', 'webp');
    formData.append('quality', quality);

    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3002/api/convert', {
        method: 'POST',
        body: formData
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        console.log(`✅ ${quality} quality: ${duration}ms`);
      } else {
        const error = await response.text();
        console.log(`❌ ${quality} quality failed: ${error}`);
      }
    } catch (error) {
      console.log(`❌ ${quality} quality error: ${error.message}`);
    }
  }

  // Check performance report
  console.log('\n📊 Performance Report:');
  try {
    const perfResponse = await fetch('http://localhost:3002/api/performance');
    const report = await perfResponse.text();
    console.log(report);
  } catch (error) {
    console.log('Could not fetch performance report:', error.message);
  }
}

testConversion().catch(console.error); 