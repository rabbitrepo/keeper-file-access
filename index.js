require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const app = express();

// Initialize S3 with environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Use region from .env
});

// Middleware to parse JSON requests
app.use(express.json());

// Function to check if the user is allowed to access the file
async function isUserAllowed(fileName, userId, ownerId) {
  try {
    // Define the S3 object parameters to retrieve metadata
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${ownerId}/${fileName}`,
    };

    // Create a GetObjectCommand
    const command = new GetObjectCommand(params);

    // Fetch the object metadata
    const data = await s3Client.send(command);
    const metadata = data.Metadata;

    // Parse the allowed list from metadata
    const allowedList = JSON.parse(metadata.allowed || '[]');

    // Check if the user is in the allowed list
    return allowedList.includes(userId);
  } catch (error) {
    console.error('Error retrieving or checking file metadata:', error);
    throw new Error('Error checking user access');
  }
}

// Root endpoint to generate a pre-signed URL and redirect to the file
app.get('/:fileName', async (req, res) => {
  const { fileName } = req.params; // Extract fileName from path
  const { owner, user } = req.query; // Extract owner and user from query params

  if (!fileName || !owner || !user) {
    return res.status(400).json({ error: 'Missing fileName, owner, or user parameters' });
  }

  try {
    // Check if the user is allowed to access the file
    const allowed = await isUserAllowed(fileName, user, owner);

    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Define the S3 object parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${owner}/${fileName}`,
    };

    // Create a GetObjectCommand
    const command = new GetObjectCommand(params);

    // Generate a pre-signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 259200 });

    // Redirect the user to the pre-signed URL
    res.redirect(url);
  } catch (error) {
    console.error('Error generating pre-signed URL or checking access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const port = process.env.PORT || 3000; // Use port from .env or default to 3000
app.listen(port, () => {
  console.log(`File access service running at http://localhost:${port}`);
});
