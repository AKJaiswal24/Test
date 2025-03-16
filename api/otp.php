<?php

session_start();

$userdata = $_SESSION['userdata'];

$otp = $_POST["otpnm"];

if ($otp == $userdata["otp"]) {
    echo ' <script>
        window.location = "verification.php";
        </script>';
} else {
    echo ' <script>
        alert("invalid otp");
        window.location = "../index.html";
        </script>';
}

?>