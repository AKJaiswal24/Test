<?php

session_start();
if (!isset($_SESSION['userdata'])) {
    header("location: ../form.html");
}


$userdata = $_SESSION['userdata'];

$otp = $_POST["otpnm"];

if ($otp == $userdata["otp"]) {
    echo ' <script>window.location = "verification.php";
        </script>';
} else {
    echo ' <script>
        alert("invalid otp");
        window.location = "../index.php";
        </script>';
}

?>
