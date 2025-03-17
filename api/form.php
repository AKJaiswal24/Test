<?php
session_start();
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];

if ($aadhaar == 123456789123) {
    echo '<script> window.location = "admin.html"  </script>';
}

$otp = rand(1000, 9999);
// echo $otp . "<br>";


$update = mysqli_query($connect, "UPDATE voter_list SET otp = $otp WHERE aadhaar_no=$aadhaar ");


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");

if (mysqli_num_rows($check) > 0) {

    $userdata = mysqli_fetch_array($check);

    $state= $userdata["state"];
    // echo $state;


    $_SESSION['userdata'] = $userdata;
if($state==="Maharastra" ){

    echo ' <script>
    window.location = "../otppage.php";
    </script>';
    } else {
        echo ' <script>
        alert("Your state dont have election");
        window.location = "../index.html";
        </script>';
    }
} else {
    echo ' <script>
    alert("AADHAAR Number Does Not Exist");
    window.location = "../index.html";
    </script>';
}

?>