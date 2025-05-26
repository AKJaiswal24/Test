<?php
session_start();
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];
$voter_id = $_POST["voterinp"];

//  here it will fetch the current date
$today = date("y-m-d");

//  make change the date change the it will bring the election date to work
// $today = "2025-04-05";


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
    //    here it checks the state of the user
    $_SESSION['userdata'] = $userdata;
    if ($state === "$statevote") {
        $mobile = $userdata['mobile'];
    //  and here it will check the mobile no is blank or null
        if ($mobile == NULL || $mobile == 0) {
            echo '<script>  
            alert("Your mobile number is not linked");
            window.location ="mobile.html";
            </script>';
        } else {
            echo ' <script>
    window.location = "../sendotpsms.php";
    // window.location = "../otppage.php";
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
    alert("AADHAAR Number or Voter ID Does Not Exist");
    window.location = "../index.php";
    </script>';
}

?>