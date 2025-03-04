<?php
session_start();
include("connect.php");


$aadhaar = $_POST["aadhaarinp"];

$check =mysqli_query($connect, " SELECT * FROM aadhaar WHERE aadhaar_no='$aadhaar' ");

if (mysqli_num_rows($check) > 0){

    $userdata = mysqli_fetch_array($check);

    $_SESSION['userdata'] = $userdata;

    echo ' <script>
    window.location = "../otppage.php";
    </script>';

    
}

else{
    echo ' <script>
    alert("AADHAAR Number Does Not Exist");
    window.location = "../index.html";
    </script>';
}





?>