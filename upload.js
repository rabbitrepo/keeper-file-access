require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Use region from .env
});

// Function to determine Content-Type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
      return 'video/ogg';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    default:
      return 'application/octet-stream'; // Default to binary if unknown
  }
}

// Upload a file to S3
async function uploadFile(filePath, lineId) {
  const fileName = path.basename(filePath); // Extract file name from path
  const fileStream = fs.createReadStream(filePath);

  // Determine file type
  const ext = path.extname(filePath).toLowerCase();
  let fileType;
  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.svg':
      fileType = 'image';
      break;
    case '.mp4':
    case '.webm':
    case '.ogg':
      fileType = 'video';
      break;
    case '.mp3':
    case '.wav':
    case '.ogg':
      fileType = 'audio';
      break;
    default:
      fileType = 'file'; // Default to 'file' if extension is not recognized
  }

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME, // Your S3 bucket name
    Key: `${lineId}/${fileName}`, // Use the path /lineId/fileName as the key
    Body: fileStream,
    ContentType: getContentType(filePath), // Set the content type dynamically
    Metadata: {
      owner: lineId, // Use the actual lineId
      allowed: JSON.stringify(['hashedLineId1', 'hashedLineId2']),
      fileType: fileType, // Set the file type dynamically
      uploadTimestamp: new Date().toISOString(),
      fileSize: fs.statSync(filePath).size.toString(), // File size in bytes
    }
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    const data = await s3Client.send(command);
    console.log('File uploaded successfully:', data);
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

// Example usage
const filePath = './sample/sample.pdf'; // Update with your file path
const lineId = 'hashedLineId1'; // Update with your lineId
uploadFile(filePath, lineId);
