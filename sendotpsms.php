<?php

// $data = json_decode(file_get_contents("php://input"), true);

include("api/connect.php");
session_start();

$userdata = $_SESSION['userdata'];
$phone_number = $userdata["mobile"];

$dbotp = $userdata["otp"];
echo $dbotp."<br>";

// echo $phone_number . "<br>";

$otp = rand(1000, 9999);
echo $otp . "<br>";


$update = mysqli_query($connect, "UPDATE voter_list SET otp = $otp WHERE mobile = $phone_number ");

$newdbotp = mysqli_query($connect,"SELECT otp FROM voter_list WHERE mobile=$phone_number");
$newdbotp2 = mysqli_fetch_array($newdbotp);
echo $newdbotp2;

// if (mysqli_affected_rows($connect) > 0) {
//     echo '<script>
//         window.location = "otppage.php";
//     </script>';
// } else {
//     echo "No rows were updated.";
// }

?>