<?php
session_start();
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];
$voter_id = $_POST["voterinp"];
// $today = date("y-m-d");
$today = "2025-04-05";


if ($voter_id === "admins0024") {
    echo '<script> window.location = "admin.html"  </script>';
}

$otp = rand(1000, 9999);

$update = mysqli_query($connect, "UPDATE voter_list SET otp = $otp WHERE aadhaar_no='$aadhaar' OR voter_id='$voter_id'");


$check = mysqli_query($connect, "SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' OR voter_id='$voter_id' ");

$query = mysqli_query($connect, "SELECT * FROM election_dates WHERE Date='$today' ");
$checkfetch = mysqli_fetch_array($query);
$statevote = $checkfetch['State'];

if (mysqli_num_rows($check) > 0) {

    $userdata = mysqli_fetch_array($check);

    $state = $userdata["state"];

    $_SESSION['userdata'] = $userdata;
    if ($state === "$statevote") {
        $mobile = $userdata['mobile'];
        // echo $mobile;
        if ($mobile == NULL || $mobile == 0) {
            echo '<script>  
            alert("Your mobile number is not linked");
            window.location ="mobile.html";
            </script>';
        } else {
            echo ' <script>
    // window.location = "../sendotpsms.php";
    window.location = "../otppage.php";
    </script>';
        }
    } else {
        echo ' <script>
        alert("Your state dont have election");
        window.location = "../index.php";
        </script>';
    }
} else {
    echo ' <script>
    alert("AADHAAR Number Does Not Exist");
    window.location = "../index.php";
    </script>';
}

?>