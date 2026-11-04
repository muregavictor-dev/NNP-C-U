<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// --- 1. Database Connection Details ---
$servername = "localhost";
$username = "root";
$password = "victor50556"; 
$dbname = "church_management";

// --- 2. Create Connection ---
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to UTF-8
$conn->set_charset("utf8mb4");

// --- 3. Process Form Data on POST Request ---
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // --- Get standard form data with validation ---
    $fullName = trim($_POST['memberFullName'] ?? '');
    $studentID = trim($_POST['memberStudentID'] ?? '');
    $email = trim($_POST['memberEmail'] ?? '');
    $phone = trim($_POST['memberPhone'] ?? '');
    $yearClass = $_POST['memberYearClass'] ?? '';
    $testimony = trim($_POST['memberTestimony'] ?? '');

    // Validate required fields
    if (empty($fullName) || empty($studentID) || empty($email) || empty($phone) || empty($yearClass)) {
        die("Error: All required fields must be filled out.");
    }

    // --- Handle checkbox array ---
    $groupsOfInterest = '';
    if (!empty($_POST['groups']) && is_array($_POST['groups'])) {
        $sanitized_groups = array_map('htmlspecialchars', $_POST['groups']);
        $groupsOfInterest = implode(', ', $sanitized_groups);
    }

    // --- 4. Prepare and Bind SQL Statement (Prevents SQL Injection) ---
    $stmt = $conn->prepare("INSERT INTO members (studentID, fullName, email, phone, yearClass, groupsOfInterest, testimony) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        die("Prepare failed: " . $conn->error);
    }

    // 's' stands for string. We have 7 string parameters.
    $stmt->bind_param("sssssss", $studentID, $fullName, $email, $phone, $yearClass, $groupsOfInterest, $testimony);

    // --- 5. Execute and Provide Feedback ---
    if ($stmt->execute()) {
        echo "<!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Registration Successful</title>
            <link href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' rel='stylesheet'>
            <link rel='stylesheet' href='registration.css'>

        </head>
        <body class='registration-page registration-success'>
            <div class='success-card'>
                <div class='success-icon'>🎉</div>
                <h1 class='text-success mb-3'>Registration Successful!</h1>
                <p class='lead'>Welcome to the NNP Christian Union, <strong>" . htmlspecialchars($fullName) . "</strong>!</p>
                <p class='text-muted'>We're thrilled to have you join our family. You'll receive a welcome email shortly.</p>
                <a href='index.php' class='btn-custom'>Return to Homepage</a>
            </div>
        </body>
        </html>";
    } else {
        $errorMsg = "Error executing statement: " . $stmt->error;
        
        // Check for duplicate entry error
        if ($stmt->errno == 1062) {
            $errorMsg = "An account with that Student ID or Email already exists. Please check your details or contact us if you believe this is an error.";
        }
        
        echo "<!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Registration Failed</title>
            <link href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' rel='stylesheet'>
            <link rel='stylesheet' href='registration.css'>

        </head>
        <body class='registration-page registration-error'>
            <div class='error-card'>
                <div class='error-icon'>⚠️</div>
                <h1 class='text-danger mb-3'>Registration Failed</h1>
                <p class='lead'>" . htmlspecialchars($errorMsg) . "</p>
                <a href='index.php' class='btn-custom'>Try Again</a>
            </div>
        </body>
        </html>";
    }

    // --- 6. Close statement ---
    $stmt->close();
} else {
    // If someone accesses this page directly without submitting the form
    header("Location: index.php");
    exit();
}

// --- 7. Close connection ---
$conn->close();
?>