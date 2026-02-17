<?php
/**
 * Simple CORS Proxy for PDB Files
 * Fetches files from RCSB PDB and returns them with proper CORS headers
 */

// Enable CORS for all origins
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the PDB ID from query parameter
$pdbId = isset($_GET['pdb']) ? $_GET['pdb'] : '';

// Validate PDB ID (should be 4 characters alphanumeric)
if (empty($pdbId) || !preg_match('/^[a-zA-Z0-9]{4}$/', $pdbId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid PDB ID. Must be 4 alphanumeric characters.']);
    exit;
}

// Construct RCSB URL
$url = "https://files.rcsb.org/view/{$pdbId}.pdb";

// Fetch the PDB file using cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Check for errors
if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode ?: 500);
    echo json_encode([
        'error' => 'Failed to fetch PDB file',
        'pdb_id' => $pdbId,
        'http_code' => $httpCode,
        'curl_error' => $error
    ]);
    exit;
}

// Return the PDB file with proper content type
header('Content-Type: text/plain; charset=utf-8');
header('Content-Length: ' . strlen($response));
echo $response;
